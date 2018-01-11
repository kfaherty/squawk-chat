var request = require('request');
var express = require('express');
var Promise  = require('promise');
var bodyParser = require('body-parser');
var cacheMaker = require("./cacheMaker");
var uuid=require('uuid');
var CryptoJS = require('crypto-js');
var cookie = require('cookie');

var port = 4000;

start( port );

function start( port ){
    var app = express();
    var http = require('http').Server(app);
    var io = require('socket.io')(http);
    var ss = require('socket.io-stream');
    io.set('transports', ['websocket', 'polling']);

    console.log('This process is pid', process.pid );

    app.use( bodyParser.json() ); // for parsing application/json
    app.use( bodyParser.urlencoded( { extended: true } ) ); // for parsing application/x-www-form-urlencoded
    app.enable('trust proxy');

    /*   ==================================================
    /    ============== webhooks & callbacks ==============
    /    ==================================================
    */

    var createToken = function(){
        //create a unique token
        var uniqueToken=uuid.v1();
        return uniqueToken;
    }

    var serveFile = function(filename,contentType){
        return function(req,res){
            res.sendFile(__dirname+"/"+filename,{headers:{'Content-Type':contentType || 'text/html'}});
        }
    }

    app.all('*', function( req, res, next ){
        console.log(req.url);
        res.type( 'application/json' );
        console.log( req.method, req.url );
        next();
    });

    app.get('/node', function(req, res) {
        res.send('enemyspeak backend');
    });

    /********************************************************************************/
    /*********************************** SOCKETIO ***********************************/
    /********************************************************************************/

    var sessions = []; // this is where we're going to keep our session tokens and stuff.
    var usersConnected = 0;
    var id_seq = 0;
    io.on( 'connection', function( socket ){
        usersConnected++;
        var userData={};

        console.log('a user connected', usersConnected, 'This process is pid', process.pid );
        // console.log(socket);


        // sessiontoken //
        function checkToken() {
            // console.log( 'header', socket.handshake.headers );
            var user;
            if (socket.handshake.headers && socket.handshake.headers.cookie) { // check if cookie fields exist
                var cookies = cookie.parse(socket.handshake.headers.cookie);
                if (cookies.sessiontoken) {
                    console.log('checkToken',cookies.sessiontoken,socket.handshake.headers["x-forwarded-for"]);
                    user = sessions.find(function (obj) { 
                        return (obj.ip === socket.handshake.headers["x-forwarded-for"] && obj.sessiontoken === cookies.sessiontoken); 
                    });
                }
            }
            if (user) {
                userData = user;
                console.log('current user', userData);

                if (userData.hasTwitter) {
                    if (!twit) {
                        createTwitter();
                    }
                    socket.emit('twittertoken',{
                        hasTwitter: userData.hasTwitter,
                        user_id: userData.user_id,
                        screen_name: userData.screen_name
                    });
                }

                socket.join( userData.id ); // join your own room with your user id
            } else {
                createSessionToken();
            }
        }
        
        checkToken();

        function createSessionToken() {
            var token = createToken();

            console.log(' create token ------------------------------------------');
            console.log( socket.handshake.headers["x-forwarded-for"] );
            console.log( token );
            console.log('--------------------------------------------------------');
            id_seq++;

            sessions.push({ 
                sessiontoken:token,
                hasTwitter:false,
                id: id_seq,
                ip: socket.handshake.headers["x-forwarded-for"] // nginx isn't giving us x-real-ip..  // socket.conn.request.headers['x-forwarded-for']
            });

            userData = {
                sessiontoken:token,
                hasTwitter:false,
                id: id_seq,
                ip: socket.handshake.headers["x-forwarded-for"] // nginx isn't giving us x-real-ip..  // socket.conn.request.headers['x-forwarded-for'] 
            };
            console.log('current user', userData);

            socket.join( userData.id ); // join your own room with your user id
            socket.emit('sessiontoken',token);
        }

        
        socket.on( 'disconnect', function(){
            usersConnected--;
            console.log('user disconnected', usersConnected);
            if(userData.id){
                socket.leave(userData.id);
                userData = {}; // clear user data, might not be necessary, closure should take care of it
            }
        });

        function authorizeRequest() {
            return new Promise(function(resolve,reject) {
                if (!userData.hasTwitter) {
                    // NOTE: this is just to get the socket to update its cache
                    // after you authenticate..

                    // see fixme on 183
                    
                    user = sessions.find(function (obj) { 
                        return (obj.id === userData.id)
                    });
                    if (user && user.hasTwitter) {
                        userData = user; 
                      
                    }
                }
                if (userData.hasTwitter) {
                    if (!twit) {
                        createTwitter();
                    }
                    return resolve();
                }

                return reject();
            })
        }

        // ANYTHING BELOW HERE NEEDS AUTH

    });

    http.listen(port, function(){
        console.log('listening on *:', port);
    });
}