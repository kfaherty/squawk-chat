import loadURLS from './apiurls';
import Cookies from 'universal-cookie';
const cookies = new Cookies();

const apiurls = loadURLS();
if (!apiurls.useProd) {
	console.warn('using dev');
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

var globalUnread = 0;

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
			bookmarksList = cookiedata.bookmarks;
			friendsList = cookiedata.friends;
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
		formData.append('password', password);
		formData.append('no_bookmarks', true);
		// formData.append('no_friends', true);
		
		fetch(apiurls.loginurl,{ 
			method: 'POST',
		  	body: formData
	  	}).then(response => response.json())
		.catch(error => console.error('Error:', error))
		.then(response => {
			// console.log('Success:', response);
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
		    cookies.set('friends', friendsList, 					{ path: '/' });

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
	cookies.remove('bookmarks');

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
listenToData(); // create listeners.

// data sources
var channelsList = {}; // hashmap of rooms
var channelMessages = {}; // this is a hashmap of room messages
var channelUsers = {}; // this a hashmap of room users
var channelsJoined = []; // this is just going to be a standard array of names.
var usersCache = []; // LIS data.
var privateChannelsList = {};
var bookmarksList = []; // we're not going to know who is a bookmark and who is a friend unless we use the data from login.
var friendsList = [];
var socketListeners = []; // listeners hashmap

// id sequences
var messageSeq = 0;

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

		if (apiurls.useProd) {
			socket = new WebSocket(apiurls.prodsocketurl);
		} else {
			socket = new WebSocket(apiurls.devsocketurl);
		}
		socket.onopen = function(event) {
			socket.send( 'IDN '+ JSON.stringify({ "method": "ticket", "account": userData.account, "ticket": userData.ticket, "character": userData.name, "cname": "SquawkChat", "cversion": apiurls.version }) );
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
					// FIXME: Don't send stuff before recieving the corresponding NLN with the character name or you'll desync
					resolve();
					loginPromiseResolve(userData.name);
					// console.log(code,payload);
					break;
				case 'PIN':
					socket.send('PIN');
					break;
				case 'ERR':
					// console.log(code,payload);
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
					// if (payload && payload.number === 4) {
					reject(payload.message);
					// }
					break;
				default: 
					if (socketListeners[code]) {
						for (var i = socketListeners[code].length - 1; i >= 0; i--) {
							socketListeners[code][i](payload);
						}
					}
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


	
	});
}

function fetchChannels() {
	gotLoginPromise().then(()=>{ // this should lazy load this.
		socket.send('CHA');
	});	
}

function fetchPrivate() {
	gotLoginPromise().then(()=>{ // this should lazy load this.
		socket.send('ORS');
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
	// console.log(socketListeners);
	if (socketListeners[eventcode]) {
		socketListeners[eventcode].push(callback);
		return;
	}
	socketListeners[eventcode] = [callback];

	// socket.addEventListener("message",function(event) { // this is slow.
	// 	if (!event.data) {
	// 		return;
	// 	}
	// 	let code = event.data.substr(0,3);
	// 	if (code === eventcode) {
	// 		let payload = '';
	// 		if (event.data.length > 3) {
	// 		    payload = JSON.parse(event.data.substr(4));
	// 		}
	// 		callback(payload);
	// 	}
	// });
}

function listenToData() {
	gotLoginPromise().then(()=>{ 			// wait for login: 
		addListenerForSocketMessage('BRO',(data)=>{  
			if (toastCallback) {
				toastCallback({
					header: 'New broadcast from '+data.character+'!',
					text: data.message,
					character: data.character
				});
			}
		});
		addListenerForSocketMessage('CBU',(data)=>{  
			// TODO: if this is us, create a toast about it.
			// if (toastCallback) {  // TODO: this should be a system message in the channel.
			// 	toastCallback({
			// 		header: data.character+' has been banned from ' + data.channel + ' by '+data.operator
			// 	});
			// }
			if (channelsJoined.indexOf(data.character) !== -1) { //  this should check if you're joined first probably.
				createSystemMessage(data.character,'[user]'+data.character+'/[user] has been banned from ' + data.channel + ' by [user]'+data.operator+'/[user]','fi-prohibited');
			}
		});
		addListenerForSocketMessage('CKU',(data)=>{  
			// TODO: if this is us, create a toast about it.
			// if (toastCallback) {  // TODO: this should be a system message in the channel.
			// 	toastCallback({
			// 		header: data.character+' has been kicked from ' + data.channel + ' by '+data.operator
			// 	});
			// }
			if (channelsJoined.indexOf(data.character) !== -1) { //  this should check if you're joined first probably.
				createSystemMessage(data.character,'[user]'+data.character+'/[user] has been kicked from ' + data.channel + ' by [user]'+data.operator+'/[user]','fi-prohibited');
			}
		});
		addListenerForSocketMessage('LIS',(data)=>{  
			// we only want to run this if we have friends to compare against.
			// If we don't have friends yet, then telling would require doing all the cache stuff. :c
			if (!bookmarksList) {
				console.log('no bookmarks', bookmarksList);
				return
			};
			if (data && data.characters) {
				data.characters.forEach(([ name,gender,status,statusmsg ]) => {
					if (bookmarksList.includes(name) ) {
						usersCache[name] = {
							channel: name,
							name: name,
							type: 3,
							bookmark: true,
							online:true,
							gender: gender,
							status: status,
							statusmsg: statusmsg
						}
					}
				});
			}
		});
		addListenerForSocketMessage('NLN',(data)=>{  // global chat connect.
			// one: create toast if this is friend/bookmark
			if (bookmarksList.indexOf(data.identity) !== -1) {
				toastCallback({
					header: data.identity + " connected",
					// text:
				})

				// two: add to users cache if we don't have it already..?
					// that's going to create a ton of data dude. 
						// this is only friends. c:
				let userData = getUserData(data.identity);
				if (!userData) {
					userData = {
						name: data.identity,
						channel: data.identity,
						type: 3,
						bookmark: true,
						status: 'online'
					}
				}
				userData.online = true;
				userData.timestamp = Date.now();
				updateUserData(userData);

				if (channelsJoined.indexOf(data.character) !== -1) { //  this should check if you're joined first probably.
					createSystemMessage(data.character,'[user]'+data.character+'/[user] connected.','fi-check');
				}
			}
		});
		addListenerForSocketMessage('FLN',(data)=>{  // global channel leave.
			// two: update channel data to leave all channels this character is in (slow, probably..)
				// does this only run if they're in a channel we're in? 
					// probably not! :c
						// this should be fast if you're only in a few rooms.
			for (var i in channelUsers){
				if (channelUsers[i].indexOf(data.character) !== -1) {
					// TODO: make sure that we aren't running this on private channels.
					let index = channelUsers[i].indexOf(data.character);
					// TODO: make sure this index isn't -1 probaly.
					channelUsers[i].splice(index,1); 
					updateChannelUsers(i,channelUsers[i]);

					// if they're a bookmark.
					if (bookmarksList.indexOf(data.character) !== -1) { // and this isn't a private channel.
						createSystemMessage(i,'[user]'+data.character+'/[user] left the channel.','fi-minus');		
					}
				}
			}

			// one: create toast if this is friend/bookmark
			if (bookmarksList.indexOf(data.character) !== -1) {
				toastCallback({
					header: data.character + " disconnected",
					// text:
				});
				let channelData = getChannelData(data.character);
			
				if (!channelData) {
					return; // if we dont have this and they left, fuck it.
				}
				channelData.online = false;
				channelData.status = 'offline';
				channelData.timestamp = Date.now();
				channelData.typing = 'clear';
				updateUserData(channelData); 
				
				if (channelsJoined.indexOf(data.character) !== -1) { //  this should check if you're joined first probably.
					createSystemMessage(data.character,'[user]'+data.character+'/[user] disconnected.','fi-x');
				}
			}

		});
		addListenerForSocketMessage('RTB',(data)=>{  
			if (data) {
				switch(data.type) {
					case 'note':
						toastCallback({
							header: 'You recieved a note from '+data.sender,
							text: '[url='+ apiurls.noteurl + data.id+']Subject: '+data.subject+'[/url]'
						});
						break;
					case 'grouprequest':
						toastCallback({header: 'You recieved a group request from '+data.name});
						break;
					case 'comment':
						toastCallback({header: 'You recieved a comment from '+data.name});  // #effort
						break;
					case 'trackadd':
						toastCallback({header: 'You added '+data.name+' to your bookmarks'});
						break;
					case 'trackrem':
						toastCallback({header: 'You removed '+data.name+' from your bookmarks'});
						break;
					case 'friendadd':
						toastCallback({header: 'You and '+data.name+' are now friends!'});
						break;
					case 'friendremove':
						toastCallback({header: 'You unfriended '+data.name});
						break;
					case 'friendrequest':
						toastCallback({header: data.name+' sent you a friend request!'});
						break;
					default:
						console.log('rtb data',data);		
						break;
				}
			}
		});
		addListenerForSocketMessage('FRL',(data)=>{  
			if (data && data.characters) {
				bookmarksList = data.characters; // cache this
		    	cookies.set('bookmarks', bookmarksList,{ path: '/' });

				// NOTE: if we want to know who is online, we need to correlate this with the users.
				if(friendsCallback) {
					friendsCallback(getFriends());
				}
			}
		});
		addListenerForSocketMessage('CHA',(data)=>{  
			let defaultTime = Date.now();
			if (data.channels && data.channels.length) {
				for (var i = data.channels.length - 1; i >= 0; i--) {
					updateChannelData({
						type: 0,
						timestamp: defaultTime,
						channel: data.channels[i].name,
						name: data.channels[i].name,
						population: data.channels[i].characters
					});
				}
				if (channelsCallback) {
					channelsCallback(channelsList);
				}
			}
		});
		addListenerForSocketMessage('ORS',(data)=>{ 
			let defaultTime = Date.now();
			if (data.channels && data.channels.length) {
				for (var i = data.channels.length - 1; i >= 0; i--) {
					updatePrivateChannelData({
						type: 1,
						timestamp: defaultTime,
						channel: data.channels[i].name,
						name: data.channels[i].title,
						population: data.channels[i].characters
					});
				}
				if (privateChannelsCallback) {
					privateChannelsCallback(privateChannelsList);
				}
			}
		});
		// addListenerForSocketMessage('LRP',(data)=>{
		// 	// TODO
		// });
		addListenerForSocketMessage('MSG',(data)=>{
			if (data && data.message) {
				let dataChannel = data.channel;
				delete data.channel;

				data.timestamp = Date.now();
				data.key = messageSeq++;

				let channelData = getChannelData(dataChannel);
				if (!channelData){
					channelData = {
						channel:dataChannel,
						unread: 0,
					}
				}

				if (bookmarksList.indexOf(data.character) !== -1) {// friends/bookmarks
					data.bookmark = true;
				}
				
				// pings.
				// const pings = [userData.name]; // TODO: load this from settings.
				if ((new RegExp(userData.name,'i')).test(data.message)) {
					data.ping = true; // set message to ping

					if (selectedChat !== data.character || !document.hasFocus()) {
						channelData.unread++; // increment badge.
						globalUnread++;
						document.title = 'SquawkChat (' + globalUnread + ')';
						if (toastCallback) {
							toastCallback({
								header: data.character+' mentioned '+userData.name+'!',
								text: data.message,
								character: data.character
							});
						}
					}
				}

				channelData.timestamp = Date.now();
				channelData.lastMessage = data.message;
				channelData.lastUser = data.character;
				updateChannelData(channelData); 
				updateChannelMessages(dataChannel,data);

				// TODO: potentially join this channel if we're not in it.
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

				let channelData = getUserData(data.character);
				if (!channelData) {
					channelData = {
						channel:data.character,
						type: 3,
						friend: friendsList.indexOf(data.character) !== -1 ? true : false,
						bookmark: bookmarksList.indexOf(data.character) !== -1 ? true : false,
						name: data.character,
						unread: 0,						
					}
				}

				if (selectedChat !== data.character || !document.hasFocus()) {
					channelData.unread++; // increment badge.
					globalUnread++;
					document.title = 'SquawkChat (' + globalUnread + ')';
					if (toastCallback) { // create toast if this isn't the selected chat.
						toastCallback({
							header: 'New message from '+data.character+'!',
							text: data.message,
							character: data.character
						});
					}
				}
				
				channelData.timestamp = Date.now();
				channelData.lastMessage = data.message;
				channelData.typing = 'clear';

				if (channelsJoined.indexOf(channelData.channel) === -1) {
					channelsJoined.push(channelData.channel);
				}

				updateUserData(channelData); 
				updateChannelMessages(data.character,messageData);
			};
		});
		addListenerForSocketMessage('TPN',(data)=>{
			// {"character":"Leon Priest","status":"clear"}
			if (data && data.character && usersCache[data.character]) {
				updateUserData({
					channel: data.character,
					typing: data.status
				}); 
			}
		});
		addListenerForSocketMessage('STA',(data)=>{  // status update
			if (bookmarksList.indexOf(data.character) !== -1) {
				toastCallback({
					header: data.character + " is " + data.status,
					text: data.statusmsg
				});
				let channelData = getUserData(data.character);
				if (!channelData) {
					channelData = {
						name: data.character,
						channel: data.character,
						type: 3,
						bookmark: true,
					}
				}
				channelData.status = data.status;
				channelData.statusmsg = data.statusmsg;
				channelData.timestamp = Date.now();
				updateUserData(channelData); 
			}
		});
		addListenerForSocketMessage('LCH',(data)=>{
			if (data && data.character) {
		
				if (bookmarksList.indexOf(data.character) !== -1) {
				// one: create a toast if this is a friend or bookmark
					// do we care if they left the channel? 
						// maybe we can just use a system message.
				// 	toastCallback({
				// 		header: data.character.identity + " is offline", //
				// 		// text:
				// 	})
					createSystemMessage(data.channel,'[user]'+data.character+'/[user] left the channel.','fi-minus');
				}

				// two: population
					// we should only do this if we're in this room. Or maybe this doesn't even matter.
						// fuck it, who cares about channel pops.
						// let channelData = getChannelData(data.channel);
						// channelData.population = channelData.population--;
						// updateChannelData(channelData); 

				// three: leave a channel if this is us and we're in it.
				if (data.character === userData.name) {  // we've already left by this point.
					return;
				} else { // if this isn't us we should update the userlist- if it is us, we don't care anymore.
					// four: userlist
					let users = channelUsers[data.channel]; 
					let index = users.indexOf(data.character);
					if (index !== -1) {
						users.splice(index,1);
						updateChannelUsers(data.channel,users);
					}
				}
			}
		});
		addListenerForSocketMessage('JCH',(data)=>{
			// console.log('jch',data);
			if (data && data.character) {
				// one: create a toast if this is a friend or bookmark
				// do we care if they join? Maybe just use a system message.
				if (bookmarksList.indexOf(data.character.identity) !== -1) {
					createSystemMessage(data.channel,'[user]'+data.character.identity+'/[user] joined the channel.','fi-plus');
				}

				// two: join a channel if this is us and we're not in it yet.
				if (data.character.identity === userData.name) {
					if (channelsJoined.indexOf(data.channel) === -1) {
						channelsJoined.push(data.channel); // add this to the list of joined channels. This should allow invites to work.
					}
				}

				// userlist
				let users = channelUsers[data.channel];
				if (users) {
					users.push(data.character.identity);
				} else {
					users = [data.character.identity];
				}
				updateChannelUsers(data.channel,users); 	// update users
			}
		});
		addListenerForSocketMessage('COL',(data)=>{ // col.nOthing
			// updateChannelData(data); // We don't really care about this.
		});
		addListenerForSocketMessage('ICH',(data)=>{
			let userlist = data.users.map((obj) => {
				return obj.identity;
			});
			updateChannelUsers(data.channel,userlist);
			delete data.users;

			updateChannelData(data);
		});
		addListenerForSocketMessage('CDS',(data)=>{
			updateChannelData(data); // description changed/ initial description
		});
		addListenerForSocketMessage('RLL',(data)=>{
			if (channelsJoined.indexOf(data.channel) !== -1) { //  this should check if you're joined first probably.
				createSystemMessage(data.channel,data.message,'fi-die-one');
			}
		});
		 // 
	});
}

var channelsCallback = undefined;
function setChannelsCallback(cb) {
	channelsCallback = cb;		
}

var privateChannelsCallback = undefined;
function setPrivateChannelsCallback(cb) {
	privateChannelsCallback = cb;
}

var joinedChannelsCallback = undefined;
function setJoinedChannelsCallback(cb) {
	joinedChannelsCallback = cb;
}

var channelMessagesCallback = undefined;
function setChannelMessagesCallback(cb) {
	channelMessagesCallback = cb;
}

var selectedChatCallback = undefined;
function setSelectedChatCallback(cb) {
	selectedChatCallback = cb;
}

var channelUsersCallback = undefined;
function setChannelUsersCallback(cb) {
	channelUsersCallback = cb;
}

var selectedChat = undefined;
function setSelectedChat(value) {
	selectedChat = value;

	if (value){ // clear unread if this is actually a room.
		let channelData = getAnyChannelData(value);

		if (!channelData) {
			console.log('you joined a channel I dont know about', selectedChat,channelData);
			return;
		}
		if (channelData.unread){
			globalUnread = globalUnread - channelData.unread;
			if (globalUnread < 0) {
				globalUnread = 0;
			}
			if (globalUnread !== 0) {
				document.title = 'SquawkChat (' + globalUnread + ')';
			} else {
				document.title = 'SquawkChat';
			}
		}
		channelData.unread = 0;
		updateAnyChannelData(channelData);
	}
}

window.addEventListener("focus", function(event) {
	if (selectedChat){ // clear unread if this is actually a room.
		let channelData = getAnyChannelData(selectedChat);

		if (channelData.unread){
			globalUnread = globalUnread - channelData.unread;
			if (globalUnread < 0) {
				globalUnread = 0;
			}
			if (globalUnread !== 0) {
				document.title = 'SquawkChat (' + globalUnread + ')';
			} else {
				document.title = 'SquawkChat';
			}
		}
		channelData.unread = 0;

		updateAnyChannelData(channelData);
	}
});

function getChannels() {
	return channelsList;
}

function getPrivateChannels() {
	return privateChannelsList;
}

// function getUsers() { // we don't use this.
// 	return usersCache; // this probably needs work.
// }

function getChannelData(name){
 	return channelsList[name];
}

function getPrivateChannelData(name) {
	return privateChannelsList[name];
}

function getUserData(name) {
	return usersCache[name];	
}

function getChannelMessages(name) {
	return channelMessages[name];
}

function getChannelUsers(name) {
	if (channelUsers[name]) {
		return channelUsers[name].map((obj) => { // TODO: use the usersCache to fill this data in.
			return usersCache[obj] || {name: obj}
		});	
	}
	return [];
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
	} else { // if an entry doesn't exist, add it
		channelsList[data.channel] = data;
	}

	// should we test if we're joined?
	if (channelsJoined.indexOf(data.channel) !== -1) {
		if (joinedChannelsCallback) { // this might be slow.
			joinedChannelsCallback(getJoinedChannels());
		}
	}

	// if this is the selected chat, then do an update.
	if (selectedChat === data.channel && selectedChatCallback) {
		selectedChatCallback(channelsList[data.channel]);
	}
}

function updatePrivateChannelData(data) {
	if (!data || !data.channel) {
		console.log('missing stuff',data)
		return;
	}

	if (data.users) {
		data.characters = data.users.length;
	}

	if (privateChannelsList[data.channel]) { // if an entry exists, update the fields you have.
		privateChannelsList[data.channel] = Object.assign(privateChannelsList[data.channel], data);
	} else { // if an entry doesn't exist, add it
		privateChannelsList[data.channel] = data;
	}

	// should we test if we're joined?
	if (channelsJoined.indexOf(data.channel) !== -1) {
		if (joinedChannelsCallback) { // this might be slow.
			joinedChannelsCallback(getJoinedChannels());
		}
	}

	// if this is the selected chat, then do an update.
	if (selectedChat === data.channel && selectedChatCallback) {
		selectedChatCallback(privateChannelsList[data.channel]);
	}
}

function updateUserData(data) {
	if (!data || !data.channel) {
		console.log('missing stuff',data)
		return;
	}

	if (usersCache[data.channel]) { // if an entry exists, update the fields you have.
		usersCache[data.channel] = Object.assign(usersCache[data.channel], data);
	} else { // if an entry doesn't exist, add it
		usersCache[data.channel] = data;
	}

	// should we test if we're joined?
	if (channelsJoined.indexOf(data.channel) !== -1) {
		if (joinedChannelsCallback) { // this might be slow.
			joinedChannelsCallback(getJoinedChannels());
		}
	}

	// if this is the selected chat, then do an update.
	if (friendsCallback) {
		friendsCallback(getFriends());
	}
}

function updateChannelMessages(channel,messages) {
	if (channelMessages[channel]) {
		channelMessages[channel].push(messages);
	} else {
		channelMessages[channel] = [messages];
	}

	// console.log('recieved update', channel, messages,channelMessages[channel], selectedChat === channel);

	if (selectedChat === channel && channelMessagesCallback) { // this only needs to run if this is selected.
		channelMessagesCallback(getChannelMessages(channel));
	}
}

function updateChannelUsers(channel,users) {
	if (channelUsers[channel]) {
		channelUsers[channel] = Object.assign(channelUsers[channel], users);
	} else {
		channelUsers[channel] = [users];
	}

	// console.log('recieved update', channel, messages,channelMessages[channel], selectedChat === channel);

	if (selectedChat === channel && channelUsersCallback) { // this only needs to run if this is selected.
		channelUsersCallback(getChannelUsers(channel));
	}
}

function getJoinedChannels() {
	return channelsJoined.map((obj) => {
		return channelsList[obj] || usersCache[obj] || privateChannelsList[obj];
	});
}

function joinChannel(name){
	if (channelsJoined.indexOf(name) !== -1) {
		// console.log('youre already in here',channelsJoined,name);
		return;
	}

	socket.send( 'JCH '+JSON.stringify({ "channel": name }) );
}

function getAnyChannelData(name) {
	return getChannelData(selectedChat) || getPrivateChannelData(selectedChat) || getUserData(selectedChat);
}

function updateAnyChannelData(channelData) {
	if (channelData.type === 3) {
		updateUserData(channelData);
	} else if (channelData.type === 0) {
		updateChannelData(channelData);
	} else {
		updatePrivateChannelData(channelData);
	}
}

function createPrivateMessage(name) {
	if (channelsJoined.indexOf(name) !== -1) {
		// console.log('youre already in here',channelsJoined,name);
		return;
	}

	if (!usersCache[name]) {
		console.log('creating data');
		updateUserData({ // create data
			channel:name,
			type: 3,
			name: name,
			friend: friendsList.indexOf(name) !== -1 ? true : false,
			bookmark: bookmarksList.indexOf(name) !== -1 ? true : false,
			timestamp: Date.now()
		}); 
	}
	
	channelsJoined.push(name);
	if (joinedChannelsCallback) {
		joinedChannelsCallback(getJoinedChannels());
	}
}

function leaveChannel(name) {
	let index = channelsJoined.indexOf(name);
	if (index === -1) {
		console.log('youre not in here',channelsJoined,name);
		return;
	}
	channelsJoined.splice(index,1); // find joined channel and remove it.
	if (joinedChannelsCallback) { // HACK: This needs to run here bcause updateChannelData wont catch it.
		joinedChannelsCallback(getJoinedChannels());
	}

	let channelData = getChannelData(name); // get type
	if(channelData.type !== 3) { // if type isnt 3
		socket.send( 'LCH '+JSON.stringify({ "channel": name }) );
	}

	// clear caches so it doesn't duplicate on rejoin.
	delete channelMessages[name];
	delete channelUsers[name];
}

var friendsCallback = undefined;
function setFriendsCallback(cb) {
	friendsCallback = cb;
}

function getFriends() {
	return Object.values(usersCache);
}

function sendMessage(channel,message) {
	if (!channel || !message) {
		console.error('missing stuff: ',channel,message);
		return;
	}
	socket.send('MSG '+JSON.stringify({ "channel": channel,"message":message }) );

	let data = {
		timestamp: Date.now(),
		key: messageSeq++,
		mine: true,
		message: message,
		character: userData.name
	}

	let channelData = getChannelData(channel);

	channelData.timestamp = Date.now();
	channelData.lastMessage = message;
	channelData.lastUser = userData.name;

	updateChannelData(channelData); 
	updateChannelMessages(channel,data);
}

function privateMessage(character,message){
	if (!character || !message) {
		console.error('missing stuff: ',character,message);
		return;
	}
	socket.send('PRI '+JSON.stringify({ "recipient": character,"message":message }) );

	let data = {
		timestamp: Date.now(),
		key: messageSeq++,
		mine: true,
		message: message,
		character: userData.name
	}

	let channelData = getUserData(character);

	channelData.timestamp = Date.now();
	channelData.lastMessage = message;
	updateUserData(channelData); 
	updateChannelMessages(character,data);
}

function createSystemMessage(channel,message,icon) {
	let data = {
		timestamp: Date.now(),
		key: messageSeq++,
		systemMessage: true,
		icon: icon || '',
		message: message,
		character: userData.name
	}

	let channelData = getAnyChannelData(channel);

	channelData.timestamp = Date.now();
	channelData.lastMessage = message;
	channelData.lastUser = '';

	updateAnyChannelData(channelData);
	updateChannelMessages(channel,data);
}

function sendTyping(type,selectedChat) {
	if (!type || !selectedChat) {
		console.log('missing stuff',type,selectedChat)
		return;
	}
	socket.send('TPN '+JSON.stringify({ "character": selectedChat,"status": type }) );
}

function updateStatus(status,statusmsg) {
	// if (!status || !statusmsg) {
	// 	console.log('missing stuff',status,statusmsg)
	// 	return;
	// }
	socket.send('STA '+JSON.stringify({ "status": status,"statusmsg": statusmsg }) );	
}

export { 	
	login,logout,
	loadCookie,gotLoginPromise,createSocket,
	lostConnectionAlert,gainedConnectionAlert,
	joinChannel,createPrivateMessage,leaveChannel,getChannelMessages,getChannelUsers,getAnyChannelData,
	fetchChannels,fetchPrivate,
	getFriends,getChannels,getJoinedChannels,getPrivateChannels,
	sendMessage,privateMessage,sendTyping,updateStatus,
	setChannelsCallback,setJoinedChannelsCallback,setSelectedChatCallback,setSelectedChat,setFriendsCallback,setCreateToastCallback,setChannelMessagesCallback,setChannelUsersCallback,setPrivateChannelsCallback
};