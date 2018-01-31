import loadURLS from './apiurls';
import Cookies from 'universal-cookie';
const cookies = new Cookies();

const apiurls = loadURLS();
const useProd = false; // TODO c:

// client announce stuff
const clientIdentity = {
	name: "SquawkChat",
	version: "0.2"
}

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

// login
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
			console.log(userData);
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
		formData.append('password', password);
		formData.append('no_bookmarks', true);
		// formData.append('no_friends', true);
		
		fetch(apiurls.loginurl,{ 
			method: 'POST',
		  	body: formData
	  	}).then(response => response.json())
		.catch(error => console.error('Error:', error))
		.then(response => {
			console.log('Success:', response);
			if (response.error) {
				reject(response.error);
				return;
			}

			userData.account = username; // cache this too because we need it in IDN
			userData.ticket = response.ticket;
			userData.characterlist = response.characters;
			userData.default_character = response.default_character;
			userData.logged_in = true;
			// userData.bookmarks = response.bookmarks;
			if (response.friends) {
				friendsList = response.friends.map((obj) => {
					return obj.source_name;
				});
			}

			let expires = new Date(Date.now() + 60 * 1000 * 30);
		    cookies.set('account', userData.account, 				{ expires: expires, path: '/' });
		    cookies.set('ticket', userData.ticket, 					{ expires: expires, path: '/' });
		    cookies.set('characterlist', userData.characterlist, 	{ expires: expires, path: '/' });
		    cookies.set('friends', friendsList, 					{ expires: expires, path: '/' });

			resolve(userData.characterlist);
		});
	});
}

function logout() {
	console.log('logging you out, byeeee');

	// cookies.clear() // not a function.
	cookies.remove('account');
	cookies.remove('ticket');
	cookies.remove('characterlist');
	cookies.remove('friends');

	window.location.reload();
}

var loginPromiseResolve;
var loginPromise = new Promise(function(resolve,reject) {
 	loginPromiseResolve = resolve;
});

function gotLoginPromise() {
  	return loginPromise;
}

var toastCallback = undefined;
function setCreateToastCallback(cb) {
	toastCallback = cb;
}

// socket
var socket;

// data sources
var channelsList = {};
var channelsJoined = []; // this is just going to be a standard array of names.
var usersCache = []; // LIS data.
var bookmarksList = []; // we're not going to know who is a bookmark and who is a friend unless we use the data from login.
var friendsList = [];

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

		if (useProd) {
			socket = new WebSocket(apiurls.prodsocketurl);
		} else {
			socket = new WebSocket(apiurls.devsocketurl);
		}
		socket.onopen = function(event) {
			socket.send( 'IDN '+ JSON.stringify({ "method": "ticket", "account": userData.account, "ticket": userData.ticket, "character": userData.name, "cname": clientIdentity.name, "cversion": clientIdentity.version }) );
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
					// console.log(code,payload);
					break;
				case 'PIN':
					socket.send('PIN');
					break;
				case 'ERR':
					console.log(code,payload);
					if (toastCallback) {
						if (payload.message){
							toastCallback({
								header: 'Error',
								text: payload.message,
								error: true
							});
						} else {
							toastCallback({
								header: 'Error',
								text: JSON.stringify(payload),
								error: true
							});
						}
					}
					if (payload && payload.number === 4) {
						reject('invalid token');
					}
					break;
				default: 
					// console.log(code,payload); // log spam dot txt
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
	// FIXME: rewrite this to just use an object lookup. 

	// this should just add a listener when it's run.
	// and the msg up there should do the logic on if it needs to be routed.

	// for var i in listeners['MSG'] do listeners['MSG'].callback() type.

	// this will get slower each listener you add because each one
	// is doing the math to find out if a code is the one we want.

	if (!eventcode || !callback) return;

	socket.addEventListener("message",function(event) { // FIXME this is slow.
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

var messageSeq = 0;

function listenToData() {
	gotLoginPromise().then(()=>{ 			// wait for login: 
		addListenerForSocketMessage('LIS',(data)=>{  
			// we can just use the api for this. 
			// although we wont have gender, then..

			// if (data && data.characters) {
			// 	let parsedCharacters = [];
			// 	for (var i = data.characters.length - 1; i >= 0; i--) {
			// 		parsedCharacters[ data.characters[i][0] ] = {
			// 			character: data.characters[i][0],
			// 			gender: data.characters[i][1],
			// 			status: data.characters[i][2],
			// 			statusMessage: data.characters[i][3]
			// 		}
			// 	}
			// 	usersCache = parsedCharacters
			// }
		});
		addListenerForSocketMessage('FRL',(data)=>{  
			if (data && data.characters) {
				// cache this
				bookmarksList = data.characters;
				// if we want to know who is online, we need to correlate this with the users.

				if(friendsCallback) {
					// TODO: map friends results onto usersCache.
					// friendsCallback();
				}
			}
		});
		addListenerForSocketMessage('CHA',(data)=>{  
			let defaultTime = Date.now();
			if (data.channels && data.channels.length) {
				let channelData = data.channels.map((obj,index) => {
					return {
						type: 0,
						timestamp: defaultTime,
						channel: obj.name,
						...obj
					}
				});
				for (var i = channelData.length - 1; i >= 0; i--) {
					updateChannelData(channelData[i]);
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
				let channelData = data.channels.map((obj,index) => {
					return {
						type: 1,
						timestamp: defaultTime,
						channel: obj.name,
						...obj
					}
				});
				for (var i = channelData.length - 1; i >= 0; i--) {
					updateChannelData(channelData[i]);
				}
				if (channelsCallback) {
					channelsCallback(channelsList);
				}
			}
		});
		addListenerForSocketMessage('MSG',(data)=>{
			if (data && data.message) {
				let dataChannel = data.channel;
				delete data.channel;

				data.timestamp = Date.now();
				data.key = messageSeq++;

				let channelData = getChannelData(dataChannel);
				if (channelData && channelData.messages) {
					channelData.messages.push(data);
				} else {
					channelData = {
						channel:dataChannel,
						messages: [data]
					}
				}
				channelData.timestamp = Date.now();
				channelData.lastMessage = data.message;
				channelData.lastUser = data.character;
				updateChannelData(channelData); 
			};
		});
		addListenerForSocketMessage('PRI',(data)=>{
			if (data && data.message) {
				// data.channel = data.character;

				let messageData = {
					timestamp: Date.now(),
					key: messageSeq++,
					character: data.character,
					message: data.message
				}

				// create toast if this isn't the selected chat.
				if (toastCallback && selectedChat !== data.character) {
					toastCallback({
						header: 'New message from '+data.character+'!',
						text: data.message
					});
				}
				
				let channelData = getChannelData(data.character);
				if (channelData) {
					channelData.messages.push(messageData);
				} else {
					channelData = {
						channel:data.character,
						type: 3,
						friend: friendsList.indexOf(data.character) !== -1 ? true : false,
						bookmark: bookmarksList.indexOf(data.character) !== -1 ? true : false,
						timestamp: Date.now(),
						name: data.character,
						lastMessage: data.message,
						lastUser: data.character,
						messages: [messageData]
					}
					channelsList[channelData.channel] = channelData;

					// if (channelsJoined.indexOf(channelData.channel) == -1) { // this is probably redundant..
						channelsJoined.push(channelData.channel);
						if (joinedChannelsCallback) { // this'll update the list of joined channels.
							joinedChannelsCallback(getJoinedChannels());
						}
					// }

					// TODO: this might want to return here.
				}

				channelData.timestamp = Date.now();
				channelData.lastMessage = data.message;
				channelData.lastUser = data.character;
				channelData.typing = 'clear';

				updateChannelData(channelData); 
			};
		});
		addListenerForSocketMessage('TPN',(data)=>{
			// {"character":"Leon Priest","status":"clear"}
			if (data && data.character) {
				// data.channel = data.character;
				// delete data.character;
				let channelData = {
					channel: data.character,
					typing: data.status
				}
				// this can break stuff.
				if (getChannelData(data.character)) { // check if this exists..
					updateChannelData(channelData); 
				}
			}
		});
		addListenerForSocketMessage('STA',(data)=>{  // status update
			if (bookmarksList.indexOf(data.character) !== -1) {
				toastCallback({
					header: data.character + " is " + data.status, // NOTE: make sure this works..
					text: data.statusmsg
				});
			}

			// NOTE: this should probably cache.
		});
		addListenerForSocketMessage('NLN',(data)=>{  // global chat connect.
			// one: create toast if this is friend/bookmark
			if (bookmarksList.indexOf(data.identity) !== -1) {
				toastCallback({
					header: data.identity + " is online", // NOTE: make sure this works..
					// text:
				})
			}

			// two: add to users cache if we don't have it already..?
		});
		addListenerForSocketMessage('FLN',(data)=>{  // global channel leave.
			
			// one: create toast if this is friend/bookmark
			if (bookmarksList.indexOf(data.character) !== -1) {
				toastCallback({
					header: data.character + " is offline", // NOTE: make sure this works..
					// text:
				})
			}

			// two: update channel data to leave all channels this character is in (slow, probably..)
			// does this only run if they're in a channel we're in? 
			// probably not! :c
		});
		addListenerForSocketMessage('LCH',(data)=>{
			if (data && data.character) {
				// one: create a toast if this is a friend or bookmark
				// do we care if they left the channel? 
				// maybe we can just use a system message.
				// if (bookmarksList.indexOf(data.character.identity) !== -1) {
				// 	toastCallback({
				// 		header: data.character.identity + " is offline", // NOTE: make sure this works..
				// 		// text:
				// 	})
				// }

				// two: leave a channel if this is us and we're in it.
				if (data.character.identity === userData.name) {
					let index = channelsJoined.indexOf(data.channel);
					if (index !== -1) {
						console.log('you left a channel',channelsJoined,index);
						channelsJoined.splice(index,1); // find joined channel and remove it.
						console.log('you left:',channelsJoined);
						if (joinedChannelsCallback) { // this'll update the list of joined channels.
							joinedChannelsCallback(getJoinedChannels());
						}
					}
				}

				// three: update channel data if it's a room we're in - userlist & population

				let channelData = getChannelData(data.channel);
				data.users = [data.character];
				if (!channelData) {
					// erm.
					console.log('user left a channel i dont know about.',channelData,data);
					return;
				}
				if (channelData.users) {
					// console.log(channelData.users);
					
					// TODO: check if this exists.
					let index = channelData.users.indexOf(data.character);
					if (index !== -1) { // check if this exists yet.
						channelData.users.splice(index,1);	// not a function
					}
					data.users=channelData.users;
				}

				delete data.character;
				updateChannelData(data); 

				if (channelsCallback) {
					channelsCallback(channelsList);
				}
			}
		});
		addListenerForSocketMessage('JCH',(data)=>{
			// console.log('jch',data);
			if (data && data.character) {
				// one: create a toast if this is a friend or bookmark
				// do we care if they join? Maybe just use a system message.
				// if (bookmarksList.indexOf(data.character.identity) !== -1) { // NOTE: make sure this works..
				// 	toastCallback({
				// 		header: data.character.identity + " is online",
				// 		// text:
				// 	})
				// }

				// two: join a channel if this is us and we're not in it yet.
				if (data.character.identity === userData.name) {
					if (channelsJoined.indexOf(data.channel) == -1) {
						channelsJoined.push(data.channel); // add this to the list of joined channels. This should allow invites to work.
						if (joinedChannelsCallback) { // this'll update the list of joined channels.
							joinedChannelsCallback(getJoinedChannels());
						}
					}
				}

				// three: update channel data if it's a room we're in - userlist & population
				let channelData = getChannelData(data.channel);
				data.users = [data.character];

				if (channelData && channelData.users) {
					// console.log(channelData.users);
					if (channelData.users.indexOf(data.character) === -1) { // check if this exists yet.
						channelData.users.push(data.character);	// not a function
					}
					data.users=channelData.users;
				}

				delete data.character;
				updateChannelData(data); 

				if (channelsCallback) {
					channelsCallback(channelsList);
				}
			}
			
		});
		addListenerForSocketMessage('COL',(data)=>{ // col.nOthing
			updateChannelData(data);
		});
		addListenerForSocketMessage('ICH',(data)=>{
			updateChannelData(data);
		});
		addListenerForSocketMessage('CDS',(data)=>{
			updateChannelData(data);
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
function setChannelsCallback(cb) {
	channelsCallback = cb;		
}

var joinedChannelsCallback = undefined;
function setJoinedChannelsCallback(cb) {
	joinedChannelsCallback = cb;
}

var selectedChatCallback = undefined;
function setSelectedChatCallback(cb) {
	selectedChatCallback = cb;
}

var selectedChat = undefined;
function setSelectedChat(value) {
	selectedChat = value;
}

function getChannelData(name){
 	return channelsList[name];
}

function updateChannelData(data) {
	if (!data || !data.channel) {
		console.log('missing stuff',data)
		return;
	}

	if (data.users) {
		data.characters = data.users.length;
	}

	if (channelsList[data.channel]) { // if an entry exists, update the fields you have.
		channelsList[data.channel] = Object.assign(channelsList[data.channel], data);

		// should we test of we're joined?
		if (channelsJoined.indexOf(data.channel) !== -1) {
			if (joinedChannelsCallback) { // this might be slow.
				joinedChannelsCallback(getJoinedChannels());
			}
		}
	} else { // if an entry doesn't exist, add it
		channelsList[data.channel] = data;
	}

	// if this is the selected chat, then do an update.
	if (selectedChat === data.channel && selectedChatCallback) {
		selectedChatCallback(channelsList[data.channel]);
	}
}

function getJoinedChannels() {
	// return channelsJoined;
	return channelsJoined.map((obj) => {
		return channelsList[obj];
	})
}

function joinChannel(name){
	if (channelsJoined.indexOf(name) !== -1) {
		console.log('youre already in here',channelsJoined,name);
		return;
	}

	socket.send( 'JCH '+JSON.stringify({ "channel": name }) );
}

function leaveChannel(name) {
	if (channelsJoined.indexOf(name) === -1) {
		console.log('youre not in here',channelsJoined,name);
		return;
	}

	socket.send( 'LCH '+JSON.stringify({ "channel": name }) );
}

var friendsCallback = undefined;
function setFriendsCallback(cb) {
	friendsCallback = cb;
}

function getFriends() {
	return friendsList;
}

function sendMessage(channel,message) {
	if (!channel || !message) {
		console.error('missing stuff: ',channel,message);
		return;
	}
	socket.send('MSG '+JSON.stringify({ "channel": channel,"message":message }) );

	// manually insert this..
	let data = {
		timestamp: Date.now(),
		key: messageSeq++,
		mine: true,
		message: message,
		character: userData.name
	}

	let channelData = getChannelData(channel);
	if (channelData && channelData.messages) {
		channelData.messages.push(data);
	} else {
		channelData = {
			channel: channel,
			messages: [data]
		}
	}
	channelData.timestamp = Date.now();
	channelData.lastMessage = message;
	channelData.lastUser = userData.name;

	updateChannelData(channelData); 
}

function privateMessage(character,message){
	if (!character || !message) {
		console.error('missing stuff: ',character,message);
		return;
	}
	socket.send('PRI '+JSON.stringify({ "recipient": character,"message":message }) );

	// manually insert this..
	let data = {
		timestamp: Date.now(),
		key: messageSeq++,
		mine: true,
		message: message,
		character: userData.name
	}

	let channelData = getChannelData(character);
	if (!channelData) {
		console.log('we need to create a pm!');
		channelData = {
			channel:data.character,
			type: 3,
			timestamp: Date.now(),
			name: data.character,
			friend: friendsList.indexOf(data.character) !== -1 ? true : false,
			bookmark: bookmarksList.indexOf(data.character) !== -1 ? true : false,
			messages: [data]
		}
		channelsList[channelData.channel] = channelData;

		channelsJoined.push(channelData.channel);
		if (joinedChannelsCallback) { // this'll update the list of joined channels.
			joinedChannelsCallback(getJoinedChannels());
		}
	} else if (channelData.messages) {
		channelData.messages.push(data);
	} else {
		channelData = {
			channel: character,
			messages: [data]
		}
	}

	channelData.timestamp = Date.now();
	channelData.lastMessage = message;
	channelData.lastUser = userData.name;

	updateChannelData(channelData); 
}

export { login,logout,loadCookie,gotLoginPromise,createSocket,lostConnectionAlert,gainedConnectionAlert,getChannels,getChannelData,joinChannel,getFriends,sendMessage,privateMessage,setChannelsCallback,setJoinedChannelsCallback,setSelectedChatCallback,setSelectedChat,setFriendsCallback,setCreateToastCallback };