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
var channelsList = {};
var channelsJoined = []; // this is just going to be a standard array of names.
var usersCache = [];

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

		listenToData(); // create listeners.
	});
}

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

function listenToData() {
	gotLoginPromise().then(()=>{ 			// wait for login: 
		addListenerForSocketMessage('CHA',(data)=>{  // FIXME: this means that calling this multiple times will create multiple listeners.
			let defaultTime = Date.now();
			if (data.channels && data.channels.length) {
				let channeldata = data.channels.map((obj,index) => {
					return {
						type: 0,
						timestamp: defaultTime,
						...obj
					}
				});
				for (var i = channeldata.length - 1; i >= 0; i--) {
					updateChannelData(channeldata[i]);
				}
				if (channelsCallback) {
					channelsCallback(channelsList);
				}
			}
		});
		addListenerForSocketMessage('ORS',(data)=>{ 
			// console.log('channels',data);
			let defaultTime = Date.now();
			if (data.channels && data.channels.length) {
				let channeldata = data.channels.map((obj,index) => {
					return {
						type: 1,
						timestamp: defaultTime,
						...obj
					}
				});
				for (var i = channeldata.length - 1; i >= 0; i--) {
					updateChannelData(channeldata[i]);
				}
				if (channelsCallback) {
					channelsCallback(channelsList);
				}
			}
		});
		addListenerForSocketMessage('CDS',(data)=>{

		});
	});
}

function getChannels(){
	// type:
	// 0 is public
	// 1 is private
	// 2 is private invite only
	// 3 is private PM

	socket.send( 'CHA' ); // 0
	socket.send( 'ORS' ); // 1
}

var channelsCallback = undefined;
function setGetChannelsCallback(cb) {
	channelsCallback = cb;		
}

function getChannelData(name){
	// let channelData = channelsList.filter((obj)=> {
 //        return obj.key == id;
 //    });
 //    if (channelData.length) {
 //    	return channelData[0];
 //    } else {
 //    	console.warn('channel with that id not found!',id);
 //    	return undefined;
 //    }
 	return channelsList[name];
}

function updateChannelData(data) {
	if (!data || !data.name) {
		console.log('missing stuff',data)
		return;
	}

	if (channelsList[data.name]) { // if an entry exists, update the fields you have.
		channelsList[data.name] = Object.assign(channelsList[data.name], data);
	} else { // if an entry doesn't exist, add it
		channelsList[data.name] = data;
	}
}

function getJoinedChannels() {
	return channelsJoined;
}

function joinChannel(name){
	if (channelsJoined.indexOf(name) !== -1) {
		console.log('i think youre already in here',channelsJoined,name);
		// TODO: toast.
		return;
	}
	socket.send( 'JCH '+JSON.stringify({ "channel": name }) );
	channelsJoined.push(name);
}

function leaveChannel(name) {

}

function getFriends() {
	return Promise.resolve( userData.friends );
}

export { login,loadCookie,gotLoginPromise,createSocket,lostConnectionAlert,gainedConnectionAlert,getChannels,joinChannel,getFriends,setGetChannelsCallback };