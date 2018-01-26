import loadURLS from './apiurls';
import Cookies from 'universal-cookie';
const cookies = new Cookies();

var apiurls = loadURLS();

// userData:
var userData = {
	account: '',
	bookmarks: [],
	characterlist: [],
	ticket: '',
	friends: [],
	default_character: '',
	logged_in: false
}

function loadCookie() {
	return new Promise(function(resolve,reject) {
		let cookiedata = cookies.getAll();
		// console.log(cookiedata);
		if (cookiedata && cookiedata.ticket) {
			userData = {
				logged_in: true,
				account: cookiedata.account,
				ticket: cookiedata.ticket,
				characterlist: cookiedata.characterlist,
				bookmarks: cookiedata.bookmarks,
				friends: cookiedata.friends
			};
			// console.log(userData);
			resolve(userData.characterlist);
		}
	});
}

function login(username,password) {
	return new Promise(function(resolve,reject) {
		if (!username || !password) {
			console.error('missing username,password',username,password);
			return;
		}

		var formData = new FormData();
		formData.append('account', username);
		formData.append('password', apiurls.password);
		
		fetch(apiurls.loginurl,{ 
			method: 'POST',
		  	body: formData
	  	}).then(response => response.json())
		.catch(error => console.error('Error:', error))
		.then(response => {
			// console.log('Success:', response);
			userData.account = username; // cache this too because we need it in IDN
			userData.ticket = response.ticket;
			userData.characterlist = response.characters;
			userData.default_character = response.default_character;
			userData.logged_in = true;
			userData.bookmarks = response.bookmarks;
			userData.friends = response.friends;

			let expires = new Date(Date.now() + 60 * 1000 * 30);
		    cookies.set('account', userData.account, 				{ expires: expires, path: '/' });
		    cookies.set('ticket', userData.ticket, 					{ expires: expires, path: '/' });
		    cookies.set('characterlist', userData.characterlist, 	{ expires: expires, path: '/' });
		    cookies.set('bookmarks', userData.bookmarks, 			{ expires: expires, path: '/' });
		    cookies.set('friends', userData.friends, 				{ expires: expires, path: '/' });
		    // console.log(cookies.getAll());

			resolve(userData.characterlist);
		});
	});
}

var loginPromiseResolve;
var loginPromise = new Promise(function(resolve,reject) {
 	loginPromiseResolve = resolve;
});

function gotLoginPromise() {
  	return loginPromise;
}

// socket
var socket;

// data sources
var channelsList = [];
var channelsJoined = []; // this is just going to be a standard array.
var usersCache = [];

function gainedConnectionAlert(cb) {
	gotLoginPromise().then(()=>{
		socket.onopen = function(event) {
			console.log('okok');
			cb(null,true);
		}
	});
}
function lostConnectionAlert(cb) {
	gotLoginPromise().then(()=>{
		socket.onclose = function(event) {
			cb(null,false);
		}
	});
}

function getChannels(cb) {

	// type:
	// 0 is public
	// 1 is private
	// 2 is private invite only
	// 3 is private pm

	return new Promise(function(resolve,reject) {
		if (channelsList.length) {
			resolve(channelsList);
		} else {
			gotLoginPromise().then(()=>{ 			// wait for response: 
				socket.send( 'CHA' );
				addListenerForSocketMessage('CHA',(data)=>{
					// console.log('channels',data);
					if (data.channels) {
						channelsList = data.channels.map((obj,index) => {
							return {
								type: 0,
								key: index,
								...obj
							}
						});

						resolve(channelsList);
					}
				});
			});
		}
	});
}

// socket.send( 'ORS' );

function addListenerForSocketMessage(eventcode,callback){
	if (!eventcode || !callback) return;

	socket.addEventListener("message",function(event) {
		if (!event.data) {
			return;
		}
		let code = event.data.substr(0,3);
		if (code === eventcode) {
			let payload = '';
			if (event.data.length > 3) {
			    payload = JSON.parse(event.data.substr(4));
			}
			callback(payload);
		}
	})
}

function createSocket(name) {
	return new Promise(function(resolve,reject) {
		// return socket if it already exists first.
		// if (socket) {
		// 	console.log(socket);
		// 	resolve();
		// 	return;
		// }

		if (!userData.logged_in) {
			reject('not logged in..',userData.logged_in);
			return;
		}

		if (!name) {
			reject('no character',name);
			return;
		}
		userData.name = name;

		socket = new WebSocket(apiurls.devsocketurl);
		socket.onopen = function(event) {
			socket.send( 'IDN '+ JSON.stringify({ "method": "ticket", "account": userData.account, "ticket": userData.ticket, "character": userData.name, "cname": "SquawkChat", "cversion": "0.1" }) );
			// CHA public channels
			// ORS is open private rooms.
		}

		// Listen for messages
		socket.onmessage = function(event) {
			if (!event.data) {
				return;
			}
			let message = event.data;

			let code = message.substr(0,3);
			let payload = '';
			if (message.length > 3) {
			    payload = JSON.parse(message.substr(4));
			}
						
			switch(code) {
				case 'IDN':
					resolve();
					loginPromiseResolve(userData.name);
					console.log(code,payload);
					break;
				case 'PIN':
					socket.send('PIN');
					break;
				case 'ERR':
					console.log(code,payload);
					if (payload && payload.number === 4) {
						reject('invalid token');
					}
					break;
				default: 
					console.log(code,payload);
					break;
			}
		};
		
		socket.onerror = function(event) {
			console.log('socket has closed',event);
			// TODO: determine when to reconnect
		};
		socket.onclose = function(event) {
			console.log('socket has closed',event);
			// TODO: determine when to reconnect
		};
	});
}

function getFriends() {
	return new Promise(function(resolve,reject) {
		
	});
}


export { login,loadCookie,gotLoginPromise,createSocket,getFriends,lostConnectionAlert,gainedConnectionAlert,getChannels };