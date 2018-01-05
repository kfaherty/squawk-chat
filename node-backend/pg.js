var pg = require("pg");
var rand = require('csprng');
var sha256 = require('sha256');
var sha1 = require('node-sha1');
var Promise  = require('bluebird');
var uuid=require('node-uuid');
var lodash=require("lodash");
var fadedMemory=require("./fadedMemory");
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

    /*
     *     AAAA  PPPPP  PPPPP       AAAA  PPPPP  PPPPP       AAAA  PPPPP  PPPPP 
     *    AA  AA PP  PP PP  PP     AA  AA PP  PP PP  PP     AA  AA PP  PP PP  PP
     *    AAAAAA PPPPP  PPPPP      AAAAAA PPPPP  PPPPP      AAAAAA PPPPP  PPPPP 
     *    AA  AA PP     PP         AA  AA PP     PP         AA  AA PP     PP    
     *    AA  AA PP     PP         AA  AA PP     PP         AA  AA PP     PP    
     */   
    

    /****************************************************************************/
    /*********************************** NEWS ***********************************/
    /****************************************************************************/
    /*
     * Save a news story to DB
     */
    this.saveStory = function( headline, source, url ){
        return pgQuery("INSERT INTO news (headline, source, url) VALUES ($1, $2, $3)",headline,source,url);
    };

    /*
     * Get last 30 stories
     */
    this.getNews = function(){
        return pgQuery("SELECT * from news ORDER BY created DESC LIMIT 30")
            .then(onlyRows);
    };

    /*
     * Delete stories older than 18 hours
     */
    this.deleteOldNews = function(){
        var queryString = "DELETE FROM news WHERE created < now()::date - interval '18 hours'";

        return pgQuery(queryString);
    };

    this.getOrogoroSources = function() {
        return ogogoroQuery("select feedname from ogogoro.newsfeed ORDER BY feedname DESC").then(function(result){
            var rows = result.rows;
            var ret=[];
            for (var i = rows.length - 1; i >= 0; i--) {
                // console.log(rows[i]);
                ret.push(rows[i].feedname);
            }
            // rows.forEach(function(row){
            //     ret.push(row.feedname);
            // });
            // console.log(rows,'ret',ret);
            return ret;
        });
    };

    /****************************************************************************/
    /********************************** JOB *************************************/
    /****************************************************************************/

    this.getJobs = function() { // returns jobs for frontend
        var queryString = "SELECT byemail,company,date,description,email,fancylocation,paid,img,job_id,jobtype,location,salary,title,url,website FROM jobs WHERE paid='true' ORDER BY date ASC";
        return pgQuery(queryString)
            .then(onlyRows); 
    };

    this.getMyJobs = function(id) { // returns jobs for frontend owned by user
        var queryString = "SELECT * FROM jobs WHERE user_id=$1 ORDER BY date ASC";
        return pgQuery(queryString,id)
            .then(onlyRows); 
    };

    this.postJob = function(userId,title,company,location,img,date,jobtype,website,description,fancylocation,joburl,salary,email,byEmail,jobId,customerId,nonce,nextbillingdate,paidthroughdate,subscription_id,status,paid,paymentmethodtoken,riskbone) { // posts a new job
        return pgQuery("INSERT INTO jobs ( user_id,title,company,location,img,date,jobtype,website,description,fancylocation,url,salary,email,byEmail,paid,job_id,customer_id,nonce,nextbillingdate,paidthroughdate,subscription_id,status,paymentmethodtoken,riskbone ) VALUES ( $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24 )", 
                                            userId,title,company,location,img,date,jobtype,website,description,fancylocation,joburl,salary,email,byEmail,paid,jobId,customerId,nonce,nextbillingdate,paidthroughdate,subscription_id,status,paymentmethodtoken,riskbone)
            .then(onlyRows);
    };
    
    // this.cancelJob = function(user_id,job_id) { // cancels a posted job duh
    //     var queryString = "UPDATE jobs SET status=$3 WHERE user_id=$1 AND job_id=$2";
    //     return pgQuery(queryString,user_id,job_id,'Cancelled')
    //         .then(onlyRows);
    // };

    // this.cancelJobById = function(subscription_id) { // deletes a posted job by subscription_id from webhook
    //     var queryString = "DELETE FROM jobs WHERE subscription_id=$1";
    //     return pgQuery(queryString,subscription_id)
    //         .then(onlyRows);
    // };


    this.getMyJobsSubscriptionId = function(user_id) {
        var queryString = "SELECT subscription_id FROM jobs WHERE user_id=$1";
        return pgQuery(queryString,user_id)
            .then(onlyRows); 
    };

    this.getJobBySubscriptionId = function(subscription_id) {
        var queryString = "SELECT * FROM jobs WHERE subscription_id=$1 LIMIT 1";
        return pgQuery(queryString,subscription_id)
            .then(onlyRows); 
    };

    this.updateJob = function(title,company,location,img,date,jobtype,website,description,fancylocation,joburl,salary,email,byEmail,user_id,job_id,riskbone) { // updates a posted job
        return pgQuery("UPDATE jobs SET title=$1,company=$2,location=$3,img=$4,date=$5,jobtype=$6,website=$7,description=$8,fancylocation=$9,url=$10,salary=$11,email=$12,byEmail=$13,riskbone=$16 WHERE user_id=$14 AND job_id=$15", 
                                        title,company,location,img,date,jobtype,website,description,fancylocation,joburl,salary,email,byEmail,user_id,job_id,riskbone)
            .then(onlyRows);
    };

    this.getJobSubscriptionId = function(job_id) {
        var queryString = "SELECT subscription_id FROM jobs WHERE job_id=$1 LIMIT 1";
        return pgQuery(queryString,job_id)
            .then(onlyRows); 
    };

    this.verifyJobOwner = function(user_id,job_id) {
        var queryString = "SELECT paid FROM jobs WHERE job_id=$1 AND user_id=$2 LIMIT 1";
        return pgQuery(queryString,job_id,user_id)
            .then(onlyRows); 
    };

    this.updateJobStatus = function(status,paid,subscription_id) {
        return pgQuery("UPDATE jobs SET status=$1,paid=$2 WHERE subscription_id=$3", 
            status,paid,subscription_id).then(onlyRows); 
    };

    /****************************************************************************/
    /************************** COMMITMENTS OF TRADERS **************************/
    /****************************************************************************/

    // this.createCommitmentData = function(name,exchange,data,category){
    //     var queryString = "INSERT INTO commitments (name,exchange,data,category) values($1,$2,$3,$4)";
    //     return pgQuery(queryString,name,exchange,data,category);
    // };

    // this.createCommitmentDataWithId = function(id,name,exchange,data,category){
    //     var queryString = "INSERT INTO commitments (id,name,exchange,data,category) values($1,$2,$3,$4,$5)";
    //     return pgQuery(queryString,id,name,exchange,data,category);
    // };

    // this.updateCommitmentData = function(name,data,exchange){
    //     var queryString = "UPDATE commitments SET data=$2,exchange=$3 WHERE name=$1";
    //     return pgQuery(queryString,name,data,exchange);
    // };

    this.getHistoricalCommitments = function(label,name,column) { // static charts
        var queryString = "select unixdate as date, "+ escape(column) +" from commitments_data where label=$1 and name=$2 order by date asc";
        return pgQuery(queryString,label,name)
            .then(onlyRows);
    }

    this.bulkUpdateCommitmentData = function(array) {
        var queryString = "BEGIN; ";
        var data;
        for (var i = array.length - 1; i >= 0; i--) {
            data = JSON.stringify(array[i]);
            data = data.substr(1,data.length-2);
            data = data.replace(/["']/g,"'");

            queryString += "INSERT INTO commitments_data (name, date,unixdate, label, openinterest, producermerchantprocessoruserlong, producermerchantprocessorusershort, swapdealerslong, swapdealersshort, swapdealersspreading, managedmoneylong, managedmoneyshort, managedmoneyspreading, otherreportableslong, otherreportablesshort, otherreportablesspreading, nonreportablepositionslong, nonreportablepositionsshort, "+
                "totalchange, totaltraders, dealerintermediarylong, dealerintermediaryshort, dealerintermediaryspreading, assetmanagerinstitutionallong, assetmanagerinstitutionalshort, assetmanagerinstitutionalspreading, leveragedfundslong, leveragedfundsshort, leveragedfundsspreading, "+
                "grosspositionfourorlesslong, grosspositionfourorlessshort, grosspositioneightorlesslong, grosspositioneightorlessshort, netpositionfourorlesslong, netpositionfourorlessshort, netpositioneightorlesslong, netpositioneightorlessshort,roworder) "+
                "VALUES("+ data +"); "; // TODO this data is unescaped.
        }
        queryString += " COMMIT;";
        return pgQuery(queryString);
    }

    this.updateCommitmentData = function(name, date, label, openinterest, 
        producermerchantprocessoruserlong, producermerchantprocessorusershort, swapdealerslong, swapdealersshort, swapdealersspreading, managedmoneylong, managedmoneyshort, managedmoneyspreading, otherreportableslong, otherreportablesshort, otherreportablesspreading, nonreportablepositionslong, nonreportablepositionsshort, 
        totalchange, totaltraders, dealerintermediarylong, dealerintermediaryshort, dealerintermediaryspreading, assetmanagerinstitutionallong, assetmanagerinstitutionalshort, assetmanagerinstitutionalspreading, leveragedfundslong, leveragedfundsshort, leveragedfundsspreading, 
        grosspositionfourorlesslong, grosspositionfourorlessshort, grosspositioneightorlesslong, grosspositioneightorlessshort, netpositionfourorlesslong, netpositionfourorlessshort, netpositioneightorlesslong, netpositioneightorlessshort,roworder) {
            var queryString = "INSERT INTO commitments_data (name, date, label, openinterest, producermerchantprocessoruserlong, producermerchantprocessorusershort, swapdealerslong, swapdealersshort, swapdealersspreading, managedmoneylong, managedmoneyshort, managedmoneyspreading, otherreportableslong, otherreportablesshort, otherreportablesspreading, nonreportablepositionslong, nonreportablepositionsshort, "+
                "totalchange, totaltraders, dealerintermediarylong, dealerintermediaryshort, dealerintermediaryspreading, assetmanagerinstitutionallong, assetmanagerinstitutionalshort, assetmanagerinstitutionalspreading, leveragedfundslong, leveragedfundsshort, leveragedfundsspreading, "+
                "grosspositionfourorlesslong, grosspositionfourorlessshort, grosspositioneightorlesslong, grosspositioneightorlessshort, netpositionfourorlesslong, netpositionfourorlessshort, netpositioneightorlesslong, netpositioneightorlessshort,roworder) "+
                "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37)";
            return pgQuery(queryString,name, date, label, openinterest, 
                producermerchantprocessoruserlong, producermerchantprocessorusershort, swapdealerslong, swapdealersshort, swapdealersspreading, managedmoneylong, managedmoneyshort, managedmoneyspreading, otherreportableslong, otherreportablesshort, otherreportablesspreading, nonreportablepositionslong, nonreportablepositionsshort, 
                totalchange, totaltraders, dealerintermediarylong, dealerintermediaryshort, dealerintermediaryspreading, assetmanagerinstitutionallong, assetmanagerinstitutionalshort, assetmanagerinstitutionalspreading, leveragedfundslong, leveragedfundsshort, leveragedfundsspreading, 
                grosspositionfourorlesslong, grosspositionfourorlessshort, grosspositioneightorlesslong, grosspositioneightorlessshort, netpositionfourorlesslong, netpositionfourorlessshort, netpositioneightorlesslong, netpositioneightorlessshort,roworder);
    }

    this.listCommitmentsNames = function() { // lists all data sources // this might be missing some.
        var queryString = "SELECT name,exchange,category FROM commitments ORDER BY category,name ASC";
        return pgQuery(queryString)
            .then(onlyRows);
    }

    this.getLatestCommitmentDate = function() { // cached max date
        var queryString = "select max(date) from commitments_data";
        return pgQuery(queryString)
            .then(onlyRows);   
    }

    // this.getLatestCommitmentData = function(name,date){
    //     var queryString = "SELECT * FROM commitments_data WHERE name=$1";
    //     return pgQuery(queryString,name)
    //         .then(onlyRows);
    // };

    this.getCommitmentDates = function() { // used to get the dates to highlight in the calendar flyout.
        var queryString = "select distinct date from commitments_data order by date desc";
        return pgQuery(queryString)
            .then(onlyRows);
    };

    this.getCommitmentData = function(name,date){ //
        var queryString = "SELECT * FROM commitments_data WHERE name=$1 AND date=$2 ORDER BY roworder ASC";
        return pgQuery(queryString,name,date)
            .then(onlyRows);
    };

    // this.getCommitmentDates = function(){ // gets events
    //     var queryString = "SELECT * FROM commitments_dates ORDER BY reportdate DESC";
    //     return pgQuery(queryString)
    //         .then(onlyRows);
    // };
    // this.setCommitmentDates = function(releasedate,reportdate){
    //     var queryString = "insert into commitments_dates (releasedate,reportdate) values($1,$2)";
    //     return pgQuery(queryString,releasedate,reportdate);
    //         // .then(onlyRows);  
    // }

    /****************************************************************************/
    /********************************** INDICES *********************************/
    /****************************************************************************/

    // save a finance quote to db
    this.saveQuote = function(identifier,value,change,changePercent){
        var queryString = "UPDATE indices SET value=$2,change=$3,changepercent=$4 WHERE identifier=$1";
        
        return pgQuery(queryString,identifier,value,change,changePercent);
            // .then(function(){
            //     return pgQuery("SELECT * from indices WHERE identifier=$1",identifier)
            //         .then(onlyRows)
            //         .then(firstRow);
            // })
    };

    // get stored quote
    this.getIndices = function(){
        var queryString = "SELECT * FROM indices ORDER BY id ASC";
        return pgQuery(queryString)
            .then(onlyRows);
    };


    /****************************************************************************/
    /************************************ notes *********************************/
    /****************************************************************************/

    this.createNote = function(ownerId,title,content,date) {
        return pgQuery("INSERT INTO notes ( ownerId,title,content,date ) VALUES ( $1, $2, $3, $4 )", ownerId,title,content,date).then(function(){
            return pgQuery("SELECT * FROM notes WHERE ownerId=$1",ownerId)
                .then(onlyRows)
        });
    };

    this.getMyNotes = function(ownerId) {
        return pgQuery("SELECT * FROM notes WHERE ownerId=$1", ownerId)
            .then(onlyRows);
            // .then(firstRow);
    };

    this.updateNote = function(id,ownerId,title,content,date){
        var queryString = "UPDATE notes SET title=$3,content=$4,date=$5 WHERE id=$1 AND ownerId=$2";
        return pgQuery(queryString,id,ownerId,title,content,date)
            .then(function(){
                return pgQuery("SELECT * FROM notes WHERE ownerId=$1",ownerId)
                    .then(onlyRows)
            });
    };

    this.deleteNote = function(id,ownerId) {
        return pgQuery("DELETE FROM notes WHERE id=$1 AND ownerId=$2", id,ownerId).then(function(){
            return pgQuery("SELECT * FROM notes WHERE ownerId=$1",ownerId)
                .then(onlyRows)
        });
    };

    /****************************************************************************/
    /************************************ twitter *******************************/
    /****************************************************************************/

    this.saveTwitterCredentials = function(id,oauth_token,oauth_token_secret) {
        return pgQuery("INSERT INTO twitter ( id,oauth_token,oauth_token_secret ) VALUES ( $1, $2, $3 )", id,oauth_token,oauth_token_secret);    
    };

    this.loadTwitterCredentials = function(id) {
        return pgQuery("SELECT id,oauth_token,oauth_token_secret FROM twitter WHERE id=$1 LIMIT 1", id)
            .then(onlyRows)
            .then(firstRow);
    };

    /****************************************************************************/
    /********************************** Currencies ******************************/
    /****************************************************************************/

    this.createCurrencyData = function(name, rate,ask,bid) {
        return pgQuery("INSERT INTO currencies ( name,rate,ask,bid ) VALUES ( $1, $2, $3,$4 )", name, rate,ask,bid);    
    };

    // save a finance quote to db
    this.saveCurrencyQuote = function(name, rate,ask,bid){
        var queryString = "UPDATE currencies SET rate=$2,ask=$3,bid=$4 WHERE name=$1";
        
        return pgQuery(queryString,name, rate,ask,bid);
            // .then(function(){
            //     return pgQuery("SELECT * from currencies WHERE identifier=$1",identifier)
            //         .then(onlyRows)
            //         .then(firstRow);
            // });
    };

    // get stored quote
    this.getCurrencies = function(){
        var queryString = "SELECT * FROM currencies";
        return pgQuery(queryString)
            .then(onlyRows);
    };

    /****************************************************************************/
    /************************************ Bonds *********************************/
    /****************************************************************************/

    this.createBondData = function(name, value,yesterday,lastweek,lastmonth) { // value is yield
        return pgQuery("INSERT INTO bonds ( name, yield,yesterday,lastweek,lastmonth ) VALUES ( $1, $2, $3,$4,$5 )", name, value,yesterday,lastweek,lastmonth);    
    };

    // save a finance quote to db
    this.saveBondQuote = function(name,value,yesterday,lastweek,lastmonth){ // data.name, data.yield,data.yesterday,data.lastweek,data.lastmonth 
        var queryString = "UPDATE bonds SET yield=$2,yesterday=$3,lastweek=$4,lastmonth=$5 WHERE name=$1";
        return pgQuery(queryString,name, value,yesterday,lastweek,lastmonth);
            // .then(function(){
            //     return pgQuery("SELECT * from currencies WHERE identifier=$1",identifier)
            //         .then(onlyRows)
            //         .then(firstRow);
            // })
    };

    // get stored quote
    this.getBonds = function(){
        var queryString = "SELECT * FROM bonds";
        return pgQuery(queryString)
            .then(onlyRows);
    };

    /****************************************************************************/
    /********************************** CALENDAR ********************************/
    /****************************************************************************/

    this.listAllCalendarEvents = function(){ // gets all events
        var queryString = "SELECT * FROM calendar ORDER BY date DESC";
        return pgQuery(queryString)
            .then(onlyRows);
    };

    this.listCalendarTypes= function() { // returns the dataids of calendar events for use in building the list of filters.
      var queryString = "SELECT MIN(title) AS title ,MIN(dataid) AS dataid FROM calendar WHERE type='event' OR type='holiday' GROUP BY title ORDER BY title ASC"; // "SELECT MIN(dataid) FROM calendar GROUP BY dataid ORDER BY dataid ASC";
        return pgQuery(queryString)
            .then(onlyRows);  
    };

    this.listCalendarEvents = function(before,after) {  // returns events between a date range
        var queryString = "SELECT * FROM calendar ORDER BY date DESC";
        return pgQuery(queryString)
            .then(onlyRows);
    };

    /****************************************************************************/
    /************************************ TIPS **********************************/
    /****************************************************************************/

    this.adminListAllTips = function() {
        var queryString = "SELECT * FROM tips ORDER BY app ASC";
        return pgQuery(queryString)
            .then(onlyRows);
    };

    this.listAllTips = function() {
        var queryString = "SELECT id,app,icon FROM tips ORDER BY app ASC";
        return pgQuery(queryString)
            .then(onlyRows);
    };

    this.getAllTipData = function() {
        var queryString = "SELECT id,app,tips FROM tips ORDER BY app ASC";
        return pgQuery(queryString)
            .then(onlyRows);  
    }

    this.getTip = function(id) {
        var queryString = "SELECT * FROM tips WHERE id=$1";
        return pgQuery(queryString,id)
            .then(onlyRows);  
    }

    /****************************************************************************/
    /********************************* update news ******************************/
    /****************************************************************************/

    this.listAllUpdates = function() {
        var queryString = "SELECT * FROM updates ORDER BY date DESC";
        return pgQuery(queryString)
            .then(onlyRows);
    };

    this.getUpdate = function(id) {
        var queryString = "SELECT * FROM updates WHERE id=$1";
        return pgQuery(queryString,id)
            .then(onlyRows);  
    }

    /****************************************************************************/
    /************************************ documentation *************************/
    /****************************************************************************/

    this.adminListAllDocumentation = function() {
        var queryString = "SELECT * FROM documentation ORDER BY id ASC";
        return pgQuery(queryString)
            .then(onlyRows);
    }

    this.listAllDocumentation = function() {
        var queryString = "SELECT id,name,icon FROM documentation ORDER BY id ASC";
        return pgQuery(queryString)
            .then(onlyRows);
    };

    this.listAllDocumentationData = function() {
        var queryString = "SELECT id,documentation FROM documentation ORDER BY id ASC";
        return pgQuery(queryString)
            .then(onlyRows);
    };

    this.getDocumentation = function(id) {
        var queryString = "SELECT * FROM documentation WHERE id=$1";
        return pgQuery(queryString,id)
            .then(onlyRows);  
    }

    /****************************************************************************/
    /*********************************** PREFERENCES ****************************/
    /****************************************************************************/

    /*
     * Get a user's Preferences
     */
    this.getPreferencesForUser = function( userId ){
        return pgQuery("SELECT * FROM preferences WHERE user_id=$1",userId)
            .then(onlyRows)
            .then(function(rows){
                if (rows.length) return rows; 
                else return {}
            ;})
    };
    /*
     * create Preferences if empty
     */
    // this.createPreferencesForUser = function( userId ){
    //     return pgQuery("INSERT INTO preferences (user_id,data) VALUES ( $1, $2 )",userId,{})
    //     .then(onlyRows)
    //     .then(function(rows) {
    //         if (rows.length===0) {
    //             return {}; 
    //         } else {
    //             return rows[0];
    //         }
    //     });
    // };
    /*
     * Update user's Preferences
     */
    this.updatePreferencesForUser = function( userId, data, name ){
        return pgQuery("SELECT data FROM preferences WHERE user_id=$1 AND name=$2",userId,name).then(function(results){
            if (results.rows.length) {
                return pgQuery("UPDATE preferences SET data=$3 WHERE user_id=$1 AND name=$2", userId, name, data);
            } else {
                return pgQuery("INSERT INTO preferences ( user_id, name, data ) VALUES ( $1, $2, $3 )", userId, name, data);    
            }
        });
    };

    /****************************************************************************/
    /*********************************** APPS ***********************************/
    /****************************************************************************/

    this.listApps = function(userId){
        return pgQuery("SELECT name, path, iconname, isdefault, isglobal, css, active, description, category, size, headline "+
            "from level_apps, users_app_libraries where level_apps.name=users_app_libraries.app_name "+
            " and users_app_libraries.user_id=$1 and level_apps.active=true"+
            " order by iconname asc",
            userId)
        .then(onlyRows);
    }
    
    this.listStoreApps = function(){ // these values have to be manually connected in socket.on('get apps')
        return pgQuery("SELECT name, path,iconname,isdefault,css,active, description, category,isglobal,size,image,headline from level_apps WHERE active='true' ORDER BY iconname asc").then(onlyRows);
    }

    this.listAllApps = function(){
        return pgQuery("SELECT name, path,iconname,isdefault,css,active, description, category,isglobal,size,image,headline from level_apps ORDER BY iconname asc").then(onlyRows);
    }

    this.getApp = function(Name){
        return pgQuery("SELECT name, path, iconname, isdefault, css, active, description, category, isglobal,size,image,headline from level_apps where name=$1",Name)
                .then(onlyRows)
                .then(firstRow);
    }

    this.assignAppToUser = function(Name, userId){
            return pgQuery("insert into users_to_apps (user_id, app_name) values ($1,$2)",userId,Name);
    }

    this.unassignAppFromUser = function(Name, userId){
            return pgQuery("delete from users_to_apps where user_id=$1 and app_name=$2",userId,Name);
    }

    /****************************************************************************/
    /*********************************** BLOGS ***********************************/
    /****************************************************************************/

    // blogs
    this.listAllBlogs = function(){
        return pgQuery("SELECT * from blogs ORDER BY dateposted DESC").then(onlyRows);
    }
    this.listLevelBlogs = function() {
        return pgQuery("SELECT id,image,header,author,body,dateposted,sources,category,bodyimages,pullquote,sharetitle FROM blogs WHERE active='true' AND level='true' ORDER BY dateposted DESC").then(onlyRows);   
    }
    this.listBoneBlogs = function() {
        return pgQuery("SELECT id,image,header,author,body,dateposted,sources,category,bodyimages,pullquote,sharetitle FROM blogs WHERE active='true' AND riskbone='true' ORDER BY dateposted DESC").then(onlyRows);   
    }
    this.getLevelBlog = function(sharetitle) {
        return pgQuery("SELECT id,image,header,author,body,dateposted,sources,category,bodyimages,pullquote,sharetitle FROM blogs WHERE active='true' AND level='true' AND sharetitle=$1",sharetitle)
            .then(onlyRows)
            .then(firstRow); 
    }
    this.getBlog = function(id) {
        return pgQuery("SELECT * from blogs where id=$1",id)
            .then(onlyRows)
            .then(firstRow); 
    }

    /****************************************************************************/
    /*********************************** JOBS ***********************************/
    /****************************************************************************/

    // riskbone jobs
    this.listAllJobs = function() {
        return pgQuery("SELECT * from jobs")
            .then(onlyRows)  
    }

    this.getJob = function(id) { // get a job
        return pgQuery("SELECT * from jobs WHERE job_id=$1",id)
            .then(onlyRows)  
    }

    this.listBoneJobs = function() { // RISKBONE JOBS
        return pgQuery("SELECT job_id,img,title,company,location,date,jobtype,website,description,url,salary,email,fancylocation,byemail from jobs WHERE riskbone='true'")
            .then(onlyRows)  
    }

    // APP:
    function convertToEpoch(date){
        return exchangeDataQuery("select extract(epoch from cast($1 as timestamp)) as epoch",date)
               .then(onlyRows)
               .then(function(rows){
                    return rows[0].epoch;
               });
    }

    var histMemoResolver=function(ticker,fromDatetime,toDatetime){
        return ticker+fromDatetime+toDatetime;
    }

    var rowsToHistoricalData = function(postfixes){
        postfixes=postfixes || [""];
        return function(rows){
                            var ret={};
                            rows.forEach(function(row){
                                ret[row.level]=ret[row.level] || {};
                                var retOb=ret[row.level];
                                var prefix=(row.side==1?"buy_":"sell_");
                                ['qty','price','ordercount'].forEach(function(infoType){
                                    postfixes.forEach(function(postfix){
                                        retOb[prefix+infoType+postfix]=row[infoType+postfix];
                                    });
                                })
                            })
                            return ret;
                        }
        }

    this.getHistoricalStats = fadedMemory(lodash.memoize(function getHistoricalStats(ticker,fromtDatetime,toDatetime){
        return Promise.all([convertToEpoch(fromtDatetime),convertToEpoch(toDatetime)])
                      .spread(function(fromDateTimeEpoch, toDateTimeEpoch){
                        return exchangeDataQuery(
                            "select min(qty) as qty_min, max(qty) as qty_max, "+
                            "min(price) as price_min, max(price) as price_max,  "+
                            "min(ordercount) as ordercount_min, max(ordercount) as ordercount_max, "+ 
                            "level, side "+
                            "from exchangedata.marketdatalevel where dataid in ( "+
                            "select dataid from exchangedata.marketdata where securityname=$1 "+
                            "and createddatetime > cast($2 as bigint) * 1000 "+
                            "and createddatetime <= cast($3 as bigint) * 1000 ) "+
                            "group by level, side "+
                            "order by cast(level as integer) desc, side asc",ticker.toUpperCase(),fromDateTimeEpoch,toDateTimeEpoch)
                        .then(onlyRows)
                        .then(rowsToHistoricalData(["_min","_max"]));
                      })
    },histMemoResolver),histMemoResolver);

    this.getSecurityNameHints = function(ticker){
        return exchangeDataQuery("SELECT symbol as hint, "+
                                 "lasttradedate,productcode as pg,exchange "+
                                 "from admin.securitydefinition where "+
                                 "symbol like $1 "+
                                 "order by hint "+
                                 "limit 15",
                                 ticker.toUpperCase()+"%")
                .then(onlyRows);
 
    };

    this.getSecurityDetail = function(ticker){
        return exchangeDataQuery("SELECT *"+
                                 "FROM admin.securitydefinition WHERE "+
                                 "symbol like $1 "+
                                 "order by symbol "+
                                 "limit 15",
                                 ticker.toUpperCase()+"%")
                .then(onlyRows);
    };

    this.getHistoricalDataTimeline = fadedMemory(lodash.memoize(function getHistoricalDataTimeline(ticker,fromDatetime,toDatetime){
        return Promise.all([convertToEpoch(fromDatetime),convertToEpoch(toDatetime)])
        .spread(function(fromDateTimeEpoch,toDateTimeEpoch){
            return exchangeDataQuery(
                "SELECT "+
                //"count(*)"+
                "to_timestamp(createddatetime/1000) as date_and_time,createddatetime % 1000 as millis, dataid, securityname"+
                " from exchangedata.marketdata"+
                " where securityname=$1"+
                " and createddatetime>cast($2 as bigint)*1000"+
                " and createddatetime<=cast($3 as bigint)*1000"+
                " order by createddatetime "
                ,ticker.toUpperCase()
                ,fromDateTimeEpoch
                ,toDateTimeEpoch
                )
                .then(onlyRows);
       });
    },histMemoResolver),histMemoResolver);

    this.getHistoricalData = function(dataid){
        return exchangeDataQuery("SELECT qty, price, ordercount, level, side from exchangedata.marketdatalevel where dataid=$1",dataid)
        .then(onlyRows)
        .then(rowsToHistoricalData());
    }

    function fixDate(dateToFix){
        var d=new Date(dateToFix);
        return new Date(d.getFullYear(),d.getMonth(),d.getDate());
    }

    this.getMarketTimes = function(ticker,date){
        date=fixDate(date);
        console.log("fixed date",date);
        return convertToEpoch(date).then(function(startEpoch){
            return exchangeDataQuery("select to_timestamp(min(createddatetime)/1000) as startDateTime, "+
                                 "to_timestamp(max(createddatetime)/1000) as endDateTime "+
                                 "from exchangedata.marketdata where securityname=$1 and createddatetime>=$2 and createddatetime<$3"
                                 ,ticker.toUpperCase(),startEpoch*1000,(startEpoch+NUM_SECONDS_IN_DAY)*1000)
                    .then(onlyRows)
                    .then(function(data){
                        console.log(data);
                        return data;
                    });
        })
        .then(firstRow);
    }

    this.getCurrentMarketData = function(ticker){
        //find the latest dataid for ticker
        //return the historical data object for that dataid
        var self=this;
        return exchangeDataQuery("select dataid,to_timestamp(createddatetime/1000) as date_and_time, "+
            " createddatetime % 1000 as millis "+
            " from exchangedata.marketdata "+
            " where securityname=$1 "+
            " order by createddatetime desc limit 1"
            ,ticker.toUpperCase()).then(onlyRows)
                    .then(function(rows){
                        return self.getHistoricalData(rows[0].dataid).then(function(data){
                            return {data:data,desc:{securityname:ticker,createddatetime:rows[0].date_and_time,millis:rows[0].millis}};
                        });
                    });
    }


        /****************************************************************************/
    /*********************************** ADMIN ***********************************/
    /****************************************************************************/

/*
 *    AAAA    DDDDD    MM   MM   IIIIII   NN   NN            AAAA    DDDDD    MM   MM   IIIIII   NN   NN
 *   AA  AA   DD  DD   MMM MMM     II     NNN  NN           AA  AA   DD  DD   MMM MMM     II     NNN  NN
 *   AAAAAA   DD  DD   MM M MM     II     NN N NN           AAAAAA   DD  DD   MM M MM     II     NN N NN
 *   AA  AA   DD  DD   MM   MM     II     NN  NNN           AA  AA   DD  DD   MM   MM     II     NN  NNN
 *   AA  AA   DDDDD    MM   MM   IIIIII   NN   NN           AA  AA   DDDDD    MM   MM   IIIIII   NN   NN
 */   

    // admin
    this.updateApp = function(name, path, iconname, isdefault, css, description,category,isglobal,size,image,headline){
        return pgQuery("UPDATE level_apps set path=$1, iconname=$2, isdefault=$3, css=$4, description=$5, category=$6,isglobal=$7,size=$9,image=$10,headline=$11 where name=$8",
                            path,iconname,isdefault,css,description,category,isglobal,name,size,image,headline);
    }
    this.addApp = function(name,path,iconName,isDefault,css,description,category,isglobal,size,image,headline){
        return pgQuery("INSERT INTO level_apps (name,path,iconname,isdefault,description,category,isglobal,css,active,size,image,headline) "+
                       "values ($1, $2, $3, $4, $5, $6,$7,$8,true,$9,$10,$11)",
                        name,path,iconName,isDefault,description,category,isglobal,css,size,image,headline);
    }
    this.deleteAppRelations = function(name) {
        return pgQuery("DELETE FROM users_to_apps WHERE app_name=$1",name);
    }
    this.deleteApp = function(name){
        return pgQuery("DELETE FROM level_apps WHERE name=$1",name);
    }
    this.disableApp = function(name){
        return pgQuery("UPDATE level_apps set active=false where name=$1",name);
    }
    this.enableApp = function(name){
        return pgQuery("UPDATE level_apps set active=true where name=$1",name);
    }
    //admin blog
    this.updateBlog = function(id,image,header,author,body,dateposted,sources,category,bodyimages,pullquote,level,riskbone,sharetitle){
        return pgQuery("UPDATE blogs set image=$2, header=$3,author=$13, body=$4, dateposted=$5, sources=$6,category=$7,bodyimages=$8,pullquote=$9,level=$10,riskbone=$11,sharetitle=$12 where id=$1",
                            id,image,header,body,dateposted,sources,category,bodyimages,pullquote,level,riskbone,sharetitle,author);
    }
    this.addBlog = function(image,header,author,body,dateposted,sources,category,bodyimages,pullquote,level,riskbone,sharetitle){
        return pgQuery("INSERT INTO blogs (image,header,author,body,dateposted,sources,category,bodyimages,pullquote,level,riskbone,sharetitle,active) "+
                       "values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)",
                        image,header,author,body,dateposted,sources,category,bodyimages,pullquote,level,riskbone,sharetitle);
    }
    this.deleteBlog = function(id){
        return pgQuery("DELETE FROM blogs WHERE id=$1",id);
    }
    this.disableBlog = function(id){
        return pgQuery("UPDATE blogs set active=false where id=$1",id);
    }
    this.enableBlog = function(id){
        return pgQuery("UPDATE blogs set active=true where id=$1",id);
    }
    //admin job

    this.disableJob = function(id){
        return pgQuery("UPDATE jobs SET paid=false where id=$1",id);
    }
    this.deleteJob = function(id) { // careful, you need to make sure the subscription is cancelled before doing this..
        return pgQuery("DELETE FROM jobs WHERE job_id=$1",id);
    }
    this.adminUpdateJob = function(title,company,location,img,date,jobtype,website,description,fancylocation,joburl,salary,email,byEmail,job_id,paid,riskbone) { // updates a posted job
        return pgQuery("UPDATE jobs SET title=$1,company=$2,location=$3,img=$4,date=$5,jobtype=$6,website=$7,description=$8,fancylocation=$9,url=$10,salary=$11,email=$12,byEmail=$13,paid=$14,riskbone=$15 WHERE job_id=$16", 
                                        title,company,location,img,date,jobtype,website,description,fancylocation,joburl,salary,email,byEmail,paid,riskbone,job_id)
            .then(onlyRows);
    }

    // admin calendar
    this.addCalendarEvent = function(title,date,dataid,time,schedule,type) {
        return pgQuery("INSERT INTO calendar (title,date,dataid,time,schedule,type) "+
                       "values ($1, $2, $3, $4, $5, $6)",
                        title,date,dataid,time,schedule,type);
    }

    this.deleteCalendarEvent = function(id) {
        return pgQuery("DELETE FROM calendar WHERE id=$1",id);
    }

    this.updateCalendarEvent = function(id, title,date,dataid,time,schedule,type) {
        return pgQuery("UPDATE calendar SET title=$1,date=$2,dataid=$3,time=$4,schedule=$5,type=$6 where id=$7", title,date,dataid,time,schedule,type,id);
    }

    // admin tips
    this.addTip = function(app, tips, icon) {
        return pgQuery("INSERT INTO tips (app, tips, icon) "+
                       "values ($1, $2, $3)",
                        app, tips, icon);
    }

    this.deleteTip = function(id) {
        return pgQuery("DELETE FROM tips WHERE id=$1",id);
    }

    this.updateTip = function(id, app, tips, icon) { // req.body.id,req.body.app,req.body.tips,req.body.icon
        return pgQuery("UPDATE tips SET app=$2, tips=$3, icon=$4 where id=$1", id, app, tips, icon);
    }

    // update news // updates
    this.addUpdate = function(headline, date, description,img) {
        return pgQuery("INSERT INTO updates (headline, date, description,img) "+
                       "values ($1, $2, $3,$4)",
                        headline, date, description,img);
    }

    this.deleteUpdate = function(id) {
        return pgQuery("DELETE FROM updates WHERE id=$1",id);
    }

    this.updateUpdate = function(id, headline, date, description,img) { // req.body.id,req.body.app,req.body.tips,req.body.icon
        return pgQuery("UPDATE updates SET headline=$2, date=$3, description=$4, img=$5 where id=$1", id, headline, date, description,img);
    }

    // documentation
    this.addDocumentation = function(name, documentation, icon) {
        return pgQuery("INSERT INTO documentation (name, documentation, icon) "+
                       "values ($1, $2, $3)",
                        name, documentation, icon);
    }

    this.deleteDocumentation = function(id) {
        return pgQuery("DELETE FROM documentation WHERE id=$1",id);
    }

    this.updateDocumentation = function(id, name, documentation, icon) {
        return pgQuery("UPDATE documentation SET name=$2, documentation=$3, icon=$4 where id=$1", id, name, documentation, icon);
    }
}

module.exports = PG;
