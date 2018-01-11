var pg = require("pg");
var rand = require('csprng');
var sha256 = require('sha256');
var sha1 = require('node-sha1');
var Promise  = require('bluebird');
var uuid=require('node-uuid');
var lodash=require("lodash");
// var fadedMemory=require("./fadedMemory");
// var request = require('request');

const NUM_SECONDS_IN_DAY=24*60*60;

var credentials = require('./pg_creds.json');

function PG(){
    var self = this;
    var shaToUse = sha1;

    var rejectAndEnd = function(error, client, reject){
        reject(error);
        console.trace();
        return console.error('rejectAndEnd', error);
    };
    
    var levelPool = new pg.Pool(credentials.levelConn);
    var marketdataPool = new pg.Pool(credentials.marketdataConn);
    var ogogoroPool = new pg.Pool(credentials.ogogoroConn);
    
    function pgQueryMaker(pool){
        function pgQuery(query,...params){
            //returns a Promise which resolves when the query has succeeded, resolves to the query result.
            //handles cleaning up the connection to the database.

            return new Promise(function(resolve,reject){
                pool.connect(function(err,client,done){
                    if (err){
                        return rejectAndEnd(err,client,reject);
                    }                
                    client.query(query,params,function(err,result){
                        done();
                        
                        /*if (err){
                            return rejectAndEnd(err,client,reject);
                        }*/
                        if (err) reject(err);
                        else resolve(result);
                    })
                })
            })
        }

        pgQuery.verbose=function(query,...params){
            return pgQuery(query,...params).catch(function(err){
                console.trace();
                console.error('pgQuery.verbose',err);
                throw err;
            });
        }
    return {pgQuery:pgQuery};
    }

    this.pgQuery = pgQueryMaker(levelPool).pgQuery;
    var pgQuery = this.pgQuery;

    this.exchangeDataQuery = pgQueryMaker(marketdataPool).pgQuery;
    var exchangeDataQuery = this.exchangeDataQuery;

    this.ogogoroQuery = pgQueryMaker(ogogoroPool).pgQuery;
    var ogogoroQuery = this.ogogoroQuery;

    //promise helper functions, helps with code readability
    function onlyRows(result){return result.rows};

    function firstRow(arr){return arr[0]};

    function userSanitized(sendBack){
        delete sendBack.password;
        delete sendBack.salt;
        delete sendBack.loginattempts;
        delete sendBack.resettoken;
        delete sendBack.verifytoken;
        delete sendBack.resetdate;
        delete sendBack.lockdate;
        return sendBack;
    }

    function resolveTrue(){return true;}


    function userLockOut(user_id){
        //resets user's loginAttempts, sets lockdate to now, returns "bad login or password";
        pgQuery("update users set lockdate=$1, loginattempts=0 where id=$2",new Date(),user_id)
        return "bad login or password";
    }

    function badUserOrPass(user_id, newAttempts){
        //updates user's loginAttempts, returns "bad login or password";
        pgQuery("update users set loginattempts=$1 where id=$2",newAttempts,user_id);
        return "bad login or password";
    }

    this.end = function(){
        pg.end();
    };


    this.getSQL = function(){

        var queryString = "SELECT table_schema, array_agg( table_name::text ) as tables FROM information_schema.tables "
            + " WHERE table_type = 'BASE TABLE'"
            + " AND ( table_schema = 'public' OR table_schema = 'chat' )"
            + " GROUP BY table_schema"
            ;


        return pgQuery(queryString).then(onlyRows);

    };

    /*
     * Get all data in a given table
     */
    this.getTableData = function( tableName ){

        var queryString = "SELECT * ";
        if( tableName === 'users'){ // only grab select data from users table
            queryString = "SELECT id, fname, lname, email, username, usertype";
        }
        queryString += " FROM " + tableName;

        if( tableName === 'news' ){
            queryString += " ORDER BY created DESC";
        }

        return pgQuery(queryString).then(onlyRows);
    };

    /* Login functionality
     * username - String - the username
     * password - String - password (plain text)
     */
    this.login = function(username, password){
        /* this is the business logic for a login attempt.
           every login attempt with a username that doesn't exist --> "bad login or password"
           every login attempt with a username that does exist checks the lockdate
                if the lockdate is <15 mins ago, --> "too many login attempts"
                otherwise it checks the password to the salt+password sha1'd
                if the password is incorrect, increment the loginAttempts.
                    if the loginAttempts are then above 4, reset the loginAttempts to 0, set the lockdate to now, --> "too many login attempts"
                    else save the loginAttempts, --> "bad login or password"
                if the password is correct, check 'verified'
                    false -> "Please verify your email address"
                    true ->
                        loginAttempts to 0, save that, return sanitized user
        */

        // console.log("query public.users");
        return pgQuery("SELECT * from public.users where username=$1 OR email=$1 LIMIT 1",username).then(onlyRows).then(function(rows){
            // console.log("query returned",rows,"rows");
            if (rows.length!==1) throw "invalid username or password";
            var data = {username: username, password:password};
            data.salt=rows[0].salt;
            data.password = sha1(data.salt + data.password);
            data.loginAttempts = Number(rows[0].loginattempts);
            var lockdate = rows[0].lockdate;
            var lockTime = 900000; //15 minutes;

            if (new Date().getTime() - new Date(lockdate).getTime() < lockTime)
            {
                throw "too many login attempts";
            }

            if (data.password != rows[0].password){
                if (rows[0].expired) {
                    throw "Your password has expired";
                }

                data.loginAttempts++;
                if (data.loginAttempts>4)
                {
                    throw userLockOut(rows[0].id);
                }
                else
                {
                    throw badUserOrPass(rows[0].id,data.loginAttempts);
                }
            }

            if (!rows[0].verified) {
                throw "Please verify your email address";
            }

            pgQuery("update users set loginattempts=0 where id=$1",rows[0].id);

            return userSanitized(rows[0]);
        });
    };

    function createToken(){
        //create a unique token
        var uniqueToken=uuid.v1();

        return uniqueToken;
    }

    this.makeToken = function(user_id, ip){
        // console.log('entered makeToken');
        var token=createToken();
        // console.log('createdToken');
        return pgQuery("insert into user_tokens (token,ip, user_id) values ($1,$2,$3)",token,ip,user_id).then(function(result){
            return token;
        });
    }

    this.checkToken = function(token,ip){
        return pgQuery("select user_id from user_tokens where token=$1 and ip=$2",token,ip).then(function(result){
            if (result.rowCount) return pgQuery("select * from users where id=$1",result.rows[0].user_id)
                .then(onlyRows)
                .then(firstRow)
                .then(userSanitized)
            else
                throw "bad user";
        });
    }
    /* Create a new user
     * username - String - the username
     * password - String - password (plain text)
     * fname - String - user first name
     * lname - String - user last name
     * email - String - user email
     * phone - String - user phone
     */
    this.createUser = function(username, fname, lname, password, email, phone, customer_id, verifytoken, promocode){
        return pgQuery("select username FROM users WHERE email=$1",email).then(function(result){
            if (result.rows.length) throw "exists";
            var data = {
                salt: rand(160, 36),
                username: username,
                password: password,
                fname: fname,
                lname: lname,
                email: username,
                phone: phone,
                img: 'images/icons/profile-image-default.svg',
                privacy: 'Everyone',
                company: '',
                verified: false,
                verifytoken: verifytoken,
                customer_id: customer_id,
                promocode: promocode
            };
            data.password=sha1(data.salt+data.password);
            return pgQuery("INSERT INTO users (username, fname, lname, password, email, salt, phone, img, privacy, company, verified, verifytoken, customer_id,promocode) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
                            data.username,data.fname,data.lname,data.password,data.email,data.salt,data.phone, data.img, data.privacy, data.company, data.verified, data.verifytoken, data.customer_id,data.promocode)
                    .then(function(){
                        return pgQuery("insert into users_to_apps (user_id, app_name) "+
                                        "select users.id, level_apps.name from users, level_apps "+
                                        "where level_apps.isdefault=true "+
                                        "and users.username=$1 "+
                                        "and not exists (select * from users_to_apps "+
                                        "where users_to_apps.app_name=level_apps.name "+
                                        "and users_to_apps.user_id=users.id)",username)
                    });
        });
    };
    /* Resend the verification email
     * 
     */
    this.resendEmail = function(username,verifytoken){
        return pgQuery("select id,verified,fname,lname,email from users where (username=$1 or email=$1) LIMIT 1",username).then(function(result){
            if (!result.rows.length) throw "invalid username or password";
            if (result.rows[0].verified) throw "User doesn't need to be verified";
            var sendBack = {
                email: result.rows[0].email,
                name: result.rows[0].fname + ' ' + result.rows[0].lname,
                url: "https://leveltradingfield.com/#verify?"+verifytoken
            };
            return pgQuery("UPDATE users SET verifytoken=$2 WHERE id=$1",result.rows[0].id, verifytoken).then(function(result) {
                return sendBack;
            });
        });
    };
    /* Verify a user's email
     * 
     */
    this.verifyEmail = function(verifytoken){
        return pgQuery("SELECT * FROM users WHERE verifytoken=$1",verifytoken).then(function(result){
            if (result.rows.length !== 1) throw "invalid token";
            if (result.rows[0].verified) throw "User doesn't need to be verified";
            return pgQuery("UPDATE users set verified = true WHERE id=$1",result.rows[0].id).then(function(){
                return result.rows[0].username;
            })
        });

    };
    /* Update users last visit to now
     * userId - number - the user's id
     */
    this.setLastVisitToNow = function(userId){
        return pgQuery("UPDATE users SET lastvisit = now() WHERE id=$1",userId);
    };
    /* email to reset a user's password
     * sets account flag for reset requested, date requested, & token
     */
    this.startPasswordReset = function(username,token){
        return pgQuery("SELECT email,fname,lname FROM users WHERE (username=$1 or email=$1)",username).then(function(result){
            if (result.rows.length !== 1) throw "invalid email";
            var sendBack = {
                email: result.rows[0].email,
                name: result.rows[0].fname + ' ' + result.rows[0].lname,
                url: "https://leveltradingfield.com/#reset?"+token
            }
            return pgQuery("UPDATE users SET resetdate=now(), resettoken=$2 WHERE (username=$1 or email=$1)",username,token).then(function(result){
                return sendBack;
            });
        });
    };
    /* Resets a user's password.
     * Uses the resettoken as a username
     */
    this.resetPassword = function(token,password){
        return pgQuery("SELECT resetdate,email,fname,lname FROM users WHERE resettoken=$1",token).then(function(result){
            var expireTime = 7200000; // 2hr
            if (result.rows.length !== 1) throw "invalid token";
            if (new Date().getTime() - new Date(result.rows[0].resetdate).getTime() > expireTime ) {
                throw "token expired";
            }
            var salt = rand(160,36);
            var sendBack = {
                email: result.rows[0].email,
                name: result.rows[0].fname + ' ' + result.rows[0].lname
            };
            return pgQuery("UPDATE users SET salt=$2,password=$3,resettoken=null,expired='false' WHERE resettoken=$1",token,salt,shaToUse(salt+password))
            .then(function(){
                return sendBack;
            });
        })
    };
    /* ACCOUNT SETTINGS */
    
    /* change profile image */
    this.setProfileImage = function(user_id,filename) {
        return pgQuery("UPDATE users SET img=$2 where id=$1",user_id,filename).then(onlyRows);
    };

    /* Update profile */
    this.updateProfile = function(id, company, bio, location, privacy, fname, lname){
        return pgQuery("UPDATE users SET location=$2,bio=$3,company=$4, privacy=$5,fname=$6,lname=$7 WHERE id=$1",
            id,location,bio,company,privacy,fname,lname);
    };

    /* change a users password */
    this.changePassword = function(id, password, newpassword) {
        return pgQuery("SELECT password,salt,email,fname,lname FROM users WHERE id=$1",id).then(function(result){
            if (result.rows.length !== 1) throw "invalid id";
            if (sha1(result.rows[0].salt + password) != result.rows[0].password) throw "invalid password";
            var newsalt = rand(160, 36);
            var sendBack = {
                email: result.rows[0].email,
                name: result.rows[0].fname + ' ' + result.rows[0].lname
            };
            return pgQuery("UPDATE users SET password=$2, salt=$3 WHERE id=$1",id,shaToUse(newsalt + newpassword),newsalt).then(function() {
                return sendBack;
            });
        });
    };

    /* change a user's email */
    this.changeEmail = function(id, email) {
        return pgQuery("SELECT email,fname,lname FROM users WHERE id=$1",id).then(function(result){
            if (result.rows.length !== 1) throw "invalid id";
            var sendBack = {
                email: result.rows[0].email,
                name: result.rows[0].fname + ' ' + result.rows[0].lname
            };
            return pgQuery("UPDATE users SET email=$2 WHERE id=$1",id,email).then(function(result){
                return sendBack;
            });
        });
    };
    /* change a user's phone */
    this.changePhone = function(id, phone) {
        return pgQuery("SELECT email,fname,lname FROM users WHERE id=$1",id).then(function(result){
            if (result.rows.length !== 1) throw "invalid id";
            var sendBack = {
                email: result.rows[0].email,
                name: result.rows[0].fname + ' ' + result.rows[0].lname
            };
            return pgQuery("UPDATE users SET phone=$2 WHERE id=$1",id,phone).then(function(result){
                return sendBack;
            });
        });
    };

    /* saves a customer id on a user profile */
    this.changeCustomerId = function(id, customer_id) {
        return pgQuery("SELECT fname,lname FROM users WHERE id=$1",id).then(function(result){
            if (result.rows.length !== 1) throw "invalid id";
            return pgQuery("UPDATE users SET customer_id=$2 WHERE id=$1",id,customer_id).then(function(result){
                return result;
            });
        });
    };


    /*      
    /       FFFFFF   RRRRR   IIIII  eeeee    nn  n  ddddd    sssss
    /       FFF      RR  R     I    ee       nnn n  d   dd   ss 
    /       FFFFFF   RRRR      I    eeeee    n n n  d   dd   ssss 
    /       FFF      RR RR     I    ee       n n n  d   dd      ss
    /       FFF      RR  R     I    eeeee    n nnn  d   dd     sss
    /       FFF      RR  R   IIIII           n  nn  ddddd    ssss 
    */      

    /* FRIENDS */

    // searches users but will return sensitive information
    // like email addresses and admin status
    // this is for the risk manager admin panel to use
    this.adminSearchUsers = function(searchText) {
        var queryString = "SELECT isadmin,email,id, fname, lname, img FROM users WHERE username ILIKE $1 OR fname ILIKE $1 OR lname ILIKE $1 OR email ILIKE $1";
        if (searchText.length<2) return Promise.reject("search params too short");

        return pgQuery(queryString,searchText+"%").then(onlyRows);
    };

    /* Search for users by first, last, email and username
     * searchText - String - the text to search for
     * @returns array of user rows matching the search
     */
    this.searchUsers = function(searchText){
        var queryString = "SELECT id, fname, lname, img FROM users WHERE username ILIKE $1 OR fname ILIKE $1 OR lname ILIKE $1 OR email ILIKE $1";
        return pgQuery(queryString,searchText+"%").then(onlyRows);
    };
    /* get a users profile 
     * searching by id
     * user id needed if they have privacy set to friends only
     */
    this.getProfile = function(user_id,profile_id){
        return pgQuery("SELECT id,fname,lname,img,bio,company,location,privacy FROM users WHERE id=$1",profile_id).then(function(result){
            if (result.rows.length !== 1) throw "invalid profile id";
            if (result.rows[0].privacy === 'No One') return {
                id: result.rows[0].id,
                fname: result.rows[0].fname,
                lname:result.rows[0].lname,
                img: result.rows[0].img,
                privacy: result.rows[0].privacy
            };
            if (result.rows[0].privacy === 'Friends Only') {
                return pgQuery("SELECT friend_id FROM friends WHERE (user_id=$1 AND friend_id = $2) AND accepted = true",user_id,profile_id).then(function(res) {
                    if (res.rows.length === 0) return { // permission denied
                        id: result.rows[0].id,
                        fname: result.rows[0].fname,
                        lname: result.rows[0].lname,
                        img: result.rows[0].img,
                        privacy: result.rows[0].privacy,
                        denied: true
                    };
                    return result.rows[0];
                });
            }
            return result.rows[0]; // assume privacy everyone.
        });
    };
    /* gets just profile pictures by id, 
     * used in gettings icons for chats
     */
    this.getProfilePicture = function(profile_id){
        return pgQuery("SELECT img FROM users WHERE id=$1",profile_id).then(function(result){
            if (result.rows.length !== 1) throw "invalid profile id";
            return result.rows[0];
        });
    };
    /* Add to friends table an unconfirmed friendship
     * from - number - the id of the requestor
     * to - number - the id of the receiver
     */
    this.sendFriendRequest = function(from, to){
        var self=this;
        if (!from || !to){
            return Promise.reject("unknown sender or reciever");
        }
        return pgQuery("INSERT INTO friends (user_id, friend_id) values ($1,$2)",from,to).then(function(){
            return self.getUserById(from).then(function(success){
                return [success];
            });
        })

    };
    /* Get friend requests for a user by id, with the details of the requestors
     * userId - number - the id of the user
     */
    this.getFriendRequests = function(userId){
        return pgQuery("SELECT id, fname, lname, img FROM friends, users where friends.friend_id = $1 and friends.accepted = false and friends.user_id=users.id ORDER BY users.fname",
                userId).then(onlyRows);
    };

    /* Get friend requests from a user by id
     * userId - number - the id of the user
     */
    this.getSentFriendRequests = function(userId){
        return pgQuery("SELECT id FROM friends, users where friends.user_id = $1 and friends.accepted = false and friends.friend_id=users.id",
                userId).then(onlyRows);
    };

    /* Accept a request
     * userId - number - the id of the user
     * friendId - number - the id of the requestor
     */
    this.acceptFriendRequest = function(userId, friendId){
        return pgQuery("SELECT * from friends where (friend_id = $2 and user_id=$1) or (friend_id=$1 and user_id=$2)",userId, friendId)
        .then(onlyRows)
        .then(function(rows){
            if (rows.length<1) throw "sorry, friend request not found";

            pgQuery("update friends set accepted=true where (friend_id = $2 and user_id=$1) or (friend_id=$1 and user_id=$2)",userId,friendId);

            if (rows.length==1){
                //match the request the reverse way.
                pgQuery("insert INTO friends (user_id,friend_id, accepted) values ($1,$2,true)",rows[0].friend_id,rows[0].user_id);
            }
        })
        .then(function(){
            return self.getUserById(friendId);
        })
   
    };
    /* reject a request (could also be used for unfriend)
     * userId - number - the id of the user
     * friendId - number - the id of the requestor
     */
    this.rejectFriendRequest = function(userId, friendId){
        return pgQuery("DELETE FROM friends WHERE (friend_id = $2 AND user_id = $1) OR (friend_id = $1 AND user_id = $2)",userId,friendId);
    };
    
    /* Get friends for a user by id
     * userId - number - the id of the user
     */
    this.getFriends = function(userId){
        var queryString = "SELECT id, fname, lname, img FROM friends, users WHERE friends.user_id = $1 AND friends.accepted = true AND friends.friend_id = users.id ORDER BY users.fname";

        return pgQuery(queryString,userId).then(onlyRows);
    };

    // this.unfriend = function( myId, friendId ){
    //     return new Promise(function( resolve, reject ){
    //         pg.connect(conString, function(err, client, done) {
    //             if(err) {
    //                 return rejectAndEnd( err, client, reject );
    //             } else {
    //                 var queryString = "";
    //                 client.query(queryString, [myId, friendId], function( err, result ) {
    //                     if(err) {
    //                         return rejectAndEnd( err, client, reject );
    //                     }
    //                     resolve(result.rows);
    //                     client.end();
    //                 });
    //             }
    //         });
    //     });
    // };
    /* Get details for a user by id
     * userId - number - the id of the user
     */
    this.getUserById = function(userId){
        var queryString = "SELECT id, fname, lname, img, username FROM users WHERE id=$1";
        return pgQuery(queryString,userId).then(onlyRows).then(firstRow);
    };
    /*
     * Get multiple users by id
     * arrayOfUserIds - the list of user ids
     */
    this.getMultipleUsers = function(arrayOfUserIds){
        var queryString = "SELECT id, fname, lname, img FROM users WHERE id in (" + arrayOfUserIds.join(',') + ")"; // TODO sanitize this, maybe?
        return pgQuery(queryString).then(onlyRows);
    };

    /* RRRRRRR  OOOOOOOO  OOOOOOOO  MM    MM */
    /* RR   RR  OO    OO  OO    OO  MMM  MMM */
    /* RRRRR    OO    OO  OO    OO  MMMMMMMM */
    /* RR  RR   OO    OO  OO    OO  MM MM MM */
    /* RR   RR  OOOOOOOO  OOOOOOOO  MM    MM */

    /* create a new chat room
     * roomId - String - random generated id - Ex: r95d6121465d1eac76784d34f826ccc8a
     * roomName - String - duplicates allowed as multiple users can create rooms with the same name
     * admin - id of user creating the roomId, required
     * publicLevel - 0 for public, 1 for group, 2 for private //0 for no admin, 1 for admin can add user, 2 for any user can add a user, default 1
     */
    this.createRoom = function(name,admin,publicLevel){
        var queryString = "INSERT INTO room (name, publiclevel, admin) VALUES ($1, $2, $3) RETURNING *";
        return pgQuery(queryString,name, publicLevel, admin).then(onlyRows);
    };

    // this.getRoomDetails = function(roomId){
    //     return new Promise(function( resolve, reject ){
    //         pg.connect(conString, function(err, client, done) {
    //             if(err) {
    //                 return rejectAndEnd( err, client, reject );
    //             } else {
    //                 var queryString = "SELECT name, publiclevel as level, admin, id FROM room WHERE id = $1 ";
    //                 client.query(queryString, [roomId], function( err, result ) {
    //                     if(err) {
    //                         return rejectAndEnd( err, client, reject );
    //                     }
    //                     if(result.rows.length === 1){
    //                         resolve(result.rows[0]);
    //                     } else {
    //                         resolve([]);
    //                     }
    //                     client.end();
    //                 });
    //             }
    //         });
    //     });
    // };

    // not used
    /* Add given users to a room.
     * roomid - String - random generated id to identify room
     * arrayOfUsers - array of user ids to add to room
     * roomDetails - details of room creation passed along
     */
    // this.addUsersToRoom = function(id, arrayOfUsers, roomDetails){
    //     function itemToQuery(item){
    //         return "( $1, '"+item+"')";
    //     }
    //     function isANumber(item){
    //         return !isNaN(item);
    //     }

    //     arrayOfUsers=arrayOfUsers.filter(isANumber);
    //     if (!arrayOfUsers.length) return Promise.resolve(roomDetails);

    //     var queryString = "INSERT INTO chatmap (id, userid) VALUES "+arrayOfUsers.map(itemToQuery).join(",");

    //     return pgQuery(queryString,id)
    //         .catch(function(err){
    //             if (err.code!='23505') console.log("addUsersToRoom err: ",err.code);
    //             return true;
    //         });
    // };

    /* Add given user to a room
     * tableid - String - random generated id to identify room
     * userId - user id to add to room
     */
    this.addUserToRoom = function(roomid, userid){
        return pgQuery("INSERT INTO chatmap (roomid, userid) VALUES ($1, $2)",roomid,userid)
            .then(resolveTrue);
    };

    // not used
    /* Get the id of the admin of a room
     * id - String corresponds to the id of the room in the room table
     */
    // this.getRoomAdminId = function( id ){
    //     return pgQuery("SELECT admin FROM room WHERE id=$1",id)
    //         .then(onlyRows)
    //         .then(firstRow);
    // };

    /* Remove user from a room
     * tableid - String - random generated id to identify room
     * userId - user id to remove from room
     */
    this.removeUserFromRoom = function(roomid, userid){
        return pgQuery("DELETE FROM chatmap WHERE (roomid = $1 AND userid = $2)",roomid,userid)
            .then(resolveTrue);
    };

    // not used
    // /* Add a user to a room via an accept
    //  * tableid - String - id of the table
    //  * userId - array of user ids to remove from room
    //  * senderId - id of user making the accept update
    //  */
    // this.acceptUserToRoom = function(tableid, userId, senderId){
    //     return pgQuery("UPDATE chatmap SET pending = false WHERE tableid = $1 AND userid = $2",tableid,userId)
    //         then(resolveTrue);
    // };

    /* Change the name of a room
     * tableid - the id of the table/room
     * roomName - the new name of the room
     */
    this.changeRoomName = function(id, roomName){
        return pgQuery("UPDATE room SET name = $2 WHERE id = $1",id, roomName)
            .then(resolveTrue);
    };

    // never called by chat module.
    /* If a room is empty it should be deleted (unless it's public level is 0)
     * a private chat is empty when there's < 2 people in it
     * a group chat is empty when there's < 1 people in it
     * id - String - random generated id to identify room
     */
    // this.checkIfRoomIsEmpty = function(id){
    //     return pgQuery("SELECT * FROM chatmap WHERE roomid = $1",id) // get users in room
    //         .then(onlyRows)
    //         .then(function(rows){
    //             return rows.length === 0 || rows.length === 1;
    //         });
    // };

    // never called by chat module
    /* Delete a room, if public level not zero
     * id - String - random generated id to identify room
     */
    // this.deleteRoomById = function(roomid){
    //     // id = escape(id);
    //     return pgQuery("DELETE FROM room WHERE id=$1 AND publiclevel <> 0",roomid) //don't remove public rooms
    //         .then(function(){
    //             if (result.rowCount === 0) throw false;
    //             // return pgQuery("DROP TABLE chat."+tableid)
    //             //     .then(resolveTrue);
    //             return pgQuery("DELETE FROM chatmap WHERE roomid=$1",roomid)
    //                 .then(function(){
    //                 }).catch(console.log);
    //             return pgQuery("DELETE FROM chatmessages WHERE roomid=$1",roomid)
    //                 .then(function(){
    //                 }).catch(console.log);
    //         }).catch(console.log);
    // };
    /* Delete a room, initiated by a user
     * roomid - String - random generated id to identify room
     * userid - bigint - the id of the user
     */

    this.deleteRoomByUser = function(roomid){
        return pgQuery("DELETE FROM chatmap WHERE roomid=$1",roomid) // kick all users
            .then(function(result){
                return pgQuery("DELETE FROM chatmessages WHERE roomid=$1",roomid) // delete all messages
                    .then(function(){
                        return pgQuery("DELETE FROM room WHERE id=$1",roomid) // delete room
                        .then(function(){
                        }).catch(console.log);
                    }).catch(console.log);
            })
            .catch(console.log);
    };

    // not called.
    /*
     * Get the list of rooms user belongs to along with ids of other users in the room
     * userId - the id of the user
     */
    // function dump(tag){
    //     return function(arg){
    //         console.log(tag,arg);
    //         return arg;
    //     }
    // }

    // function isPrivateRoom(row){
    //     return (row.publiclevel == 2);
    // }

    // function notNull(item){
    //     return item!=null;
    // }

    // function renamePrivateRoom(row){
    //     function fullName(user){
    //         //console.log(user);
    //         return user.fname+' '+user.lname;
    //     }

    //     //console.log(row);

    //     return Promise.all(row.other_users.filter(notNull).map(self.getUserById))
    //                   .then(function(arrayOfUsers){
    //                      row.name=arrayOfUsers.map(fullName).join(", ");
    //                   }).then(function(){return row;})
    // }

    // function renamePrivateRooms(rows){
    //     var rowsToFix=rows.filter(isPrivateRoom);
    //     return Promise.all(rowsToFix.map(renamePrivateRoom))
    //         .then(function(){
    //             return rows;
    //         })

    // }

    // never called by chat module..
    // this.getUserRooms = function(userId){
    //     var queryString = "SELECT room.id, room.img, room.name, room.admin, room.publiclevel,"
    //         + " array_agg(cm1.userid) as other_users "
    //         + " FROM room "
    //         +  "LEFT JOIN chatmap as cm1 ON room.id = cm1.roomid AND cm1.userid <> userid "
    //         + " WHERE userid = $1 GROUP BY room.id, room.img, room.name, room.admin, room.publiclevel";

    //     return pgQuery(queryString,userId)
    //         .then(onlyRows)
    //         .then(renamePrivateRooms)
    //         //.then(dump("getUserRooms rows"))
    //         .catch(console.log);
    // };

    this.getRooms=function(){ // no other users
        return pgQuery("SELECT room.id, room.img, room.name, room.admin, room.publiclevel, room.created "+
                           "FROM room ")//+
                           // "JOIN roomStatistics ON room.id=roomStatistics.id "+
                           // "WHERE "+
                           // "((room.publiclevel>0 AND roomStatistics.populated>1) OR "+
                           // "(room.publiclevel=0))")
                    .then(onlyRows)
                    .catch(console.log);
    };

    // get users in room by room id
    this.getUsersInRoom=function(id){
        return pgQuery("SELECT id, fname, lname from users, chatmap where users.id=chatmap.userid and chatmap.roomid=$1",id)
            .then(onlyRows)
            //.catch(console.log);
    };


    // Never called by chat module..
    // this.getRoom=function(tableId, userId){ // get room details but renames
    //     var queryString = "SELECT room.id, room.img, room.name, room.admin, room.publiclevel, "
    //         + " array_agg(cm2.userid) as other_users "
    //         + " FROM room "
    //         +  "LEFT JOIN chatmap as cm1 ON room.id = cm1.roomid AND cm1.userid <> userid "
    //         // +  "LEFT JOIN chatmap as cm1 ON room.id = cm1.roomid AND cm1.userid <> userid "
    //         // +  "LEFT JOIN chatmap as cm1 ON room.id = cm1.tableid AND cm1.pending = false "
    //         //+ " LEFT JOIN chatmap as cm2 ON cm2.tableid = cm1.tableid AND cm2.userid <> cm1.userid "
    //         // "SELECT room.id, room.img, room.name, room.admin, room.publiclevel,"
    //         // + " array_agg(cm1.userid) as other_users "
    //         // + " FROM room "
    //         // +  "LEFT JOIN chatmap as cm1 ON room.id = cm1.roomid AND cm1.userid <> userid "
    //         + " WHERE userid = $1 GROUP BY room.id, room.img, room.name, room.admin, room.publiclevel";
    //         // + " WHERE cm1.userid = $1 and cm2.tableid=$2 GROUP BY room.id, room.img, room.name, room.admin, room.publiclevel";

    //     return pgQuery(queryString,userId,tableId)
    //         .then(onlyRows)
    //         .then(renamePrivateRooms)
    //         .then(firstRow)
    //         .catch(console.log);
    // }

    /*
     * Never called by chat module
     * Get the list of users in a room
     * id - the id of the room
     */
    // this.getRoomDetails = function( roomid ){
    //     var queryString = "SELECT room.id, room.img, room.name, room.admin, room.publiclevel,"
    //         + " array_agg(cm1.userid) as other_users "
    //         + " FROM room "
    //         +  "LEFT JOIN chatmap as cm1 ON room.id = cm1.roomid AND cm1.userid <> userid "
    //         + " WHERE id = $1 GROUP BY room.id, room.img, room.name, room.admin, room.publiclevel";

    //     return pgQuery(queryString,roomid)
    //         .then(onlyRows)
    //         .then(firstRow);
    // };

    /*
     * Get the list of public chat rooms users can join
     */
    this.getPublicRooms = function(){ // ok
        var queryString = "SELECT id, img, name, publiclevel, admin FROM room WHERE publiclevel=0";
        return pgQuery(queryString)
            .then(onlyRows);
    };

    // not called
    /*
     * Ensure consistency, remove tables which are empty.
     */
    // this.removeEmptyTables = function(){

    //     function checkEmptiness( id ){
    //         self.checkIfRoomIsEmpty( id ).then(function(isEmpty){
    //              console.log( 'removeEmptyTables', isEmpty, id );

    //             if( isEmpty ){
    //                 self.deleteRoomById( id );
    //             }
    //         });
    //     }

    //     return pgQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'chat'")
    //         .then(onlyRows)
    //         .then(function(rows){
    //             rows.forEach(function(row){
    //                 checkEmptiness(row.table_name);  //launches a 'thread' per room, whose return value we never need, as long as it eventually executes
    //             });
    //             return rows;    
    //         });
    // };

    /* CHAT */

    /*  CCCCC   HH    HH   AAAAAA  TTTTTTTT */
    /* CC   CC  HH    HH  AA    AA     TT    */
    /* CC       HHHHHHHH  AAAAAAAA     TT    */
    /* CC   CC  HH    HH  AA    AA     TT    */
    /*  CCCCC   HH    HH  AA    AA     TT    */

    /*
     * Insert a message into the table
     * id - the id of the chat room
     * userId - the id of the user sending the message
     * message - text
     */
    this.sendChatMessage = function(userid,roomid, message){
        var queryString = "INSERT INTO chatmessages (userid,roomid, message) VALUES ($1, $2, $3) RETURNING *";
        return pgQuery(queryString,userid,roomid,message)
            .then(onlyRows);
    };

    var MESSAGES_LIMIT=25;

    this.previousMessages = function(roomId,beforeDate,afterDate,messageid){
        // var roomId=escape(roomId);
        var queryString='select users.fname as first_name, users.lname as last_name,chatTable.message,chatTable.messageid,chatTable.userid as userId,chatTable.createddatetime as created '+
                        'from chatmessages as chatTable left join users on users.id=cast(chatTable.userid AS bigint) where 1=1 AND chatTable.roomid=$1 ';
        if (beforeDate){
            // beforeDate=escape(beforeDate);
            queryString=queryString+'and chatTable.createddatetime< timestamp with time zone '+"'"+beforeDate+"'"+' ';
        }
        if (afterDate){
            // afterDate=escape(afterDate);
            queryString=queryString+'and chatTable.createddatetime> timestamp with time zone '+"'"+afterDate+"'"+' + interval \'1 second\' ';
        }
        if (messageid){
            messageid=escape(messageid);
            queryString=queryString+'and chatTable.messageid < '+"'"+messageid+"'"+' ';
        }

        queryString=queryString+'order by created desc limit '+(MESSAGES_LIMIT+1);
        // console.log('previousMessages',queryString);
        return pgQuery(queryString,roomId)
            .then(function(result){
                var resultPackage= {
                    rows:result.rows.splice(0,MESSAGES_LIMIT).reverse(),
                };
                if (result.rowCount>MESSAGES_LIMIT){
                    resultPackage.more=true;
                }

                resultPackage.rows.forEach(function(item){
                    item.userId=item.userid; 
                    delete item.userid; 
                    item.from=item.first_name+' '+item.last_name; 
                    item.roomId = roomId;
                    delete item.first_name; 
                    delete item.last_name;
                });

                return resultPackage;
            })
    };

    /*
     * get a users missed messages
     * userId - the id of the user
     * time - timestamp in ms since last visit
     */
    // this.getMissedMessages = function(roomId, time){
    //     return this.previousMessages(roomId, undefined, time);
    // };
}

module.exports = PG;
