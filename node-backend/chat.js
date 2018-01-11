
var userSockets={};

var userHasSocket=function(user,socket){
	//console.log(userSockets,user);
	if (!(user.id in userSockets)) userSockets[user.id]=[];
	userSockets[user.id].push(socket);
	socket.on('disconnect',function(){
		//automatically remove sockets from our personal collection if they disconnect
		if (userSockets[user.id]) userSockets[user.id]=userSockets[user.id].filter(function(s){return s!=socket;})
	});
}

function makeFinder(ar){
	var hash={};
	ar.forEach(function(val,key){
		if ("id" in val) key=val.id;
		hash[key]=val;
	});
	var myCount=ar.length;
	return {
		add:function(key,val){
			myCount++;
			hash[key]=val;
		},
		find:function(key){
			//console.log("finder find:",key);
			if (key in hash) return Promise.resolve(hash[key]);
			else return Promise.reject("key "+key+" not found");
		},
		remove:function(key){
			delete hash[key];
			myCount--;
		},
		update:function(key,val) {
			if (key in hash) {
				hash[key] = val;
			} else return Promise.reject("key "+key+" not found");
		},
		getCount:function(){return myCount;},
		contains:function(key){return key in hash},
		toArray:function(){
			var ret=[];
			for (var n in hash){
				ret.push(hash[n])
			};
			return ret;
		}

	}
}

//helper functions
function hasUser(user_id){
	return function(room){
		return room.hasUser(user_id);
	}
}

function isPublic(){
	return function(room){
		return room.isPublic();
	}
}

function toStruct(room){
	return room.toStruct();
}

var removeRoom;

function ChatInit(io,pg,isProduction){
    console.log("Chat Module Initialized",isProduction);

	if (!isProduction) return Promise.resolve("MOCK FIRST");
	//on init, we ask the database to give us all rooms, and all users and messages in those rooms

	function renamePrivateRoom(roomStruct,user_id){ // user id is this user
        return new Promise(function(resolve,reject){
			// console.log('renamePrivateRoom',roomStruct,user_id);
			if (roomStruct.publiclevel == 2){ 

				if (roomStruct.users.length == 2) {
					var index = roomStruct.users.indexOf(user_id); // this should be 1 or 0;
					if (index == -1) {
						console.log('renamePrivateRoom failed. my user not in room:',user_id,roomStruct.id);
						resolve( roomStruct ); // fail, our user isn't in this room
					}
					index = index ? 0 : 1; // convert to int. this should be 1 or 0, so this should work;
					// console.log('renamePrivateRoom index',user_id,index,roomStruct.users[index]);

					var other_id = roomStruct.users[index];
					return pg.getUserById(roomStruct.users[index]).then(function(user){
						// console.log(user,user.length);
						roomStruct.name = user.fname+' '+user.lname;
						resolve( roomStruct );
					});
				} else {
					console.log('renamePrivateRoom failed. wrong # users:',roomStruct.users.length);
					resolve( roomStruct ); // fail, wrong number of users
				}
			} else {
				resolve( roomStruct ); // we don't need to rename this if it's not private.
			}
			// return Promise.resolve(roomStruct);
		});
	}

	function Room(id,name,admin_id,publiclevel,created,options){
		var self=this;

		// var adminfname,adminlname,isgroup=0;
		//  if (publiclevel === 0 ) {
		//  	adminfname= "level";
		//  	adminlname= "trading field";
		//  } else {
		//  	this.gotAdmin=pg.getUserById(admin_id).then(function(adminInfo){
		//  		if (adminInfo){
		//  			adminfname=adminInfo.fname;
		//  			adminlname=adminInfo.lname;
		//  		}
		//  		else
		//  		{
		//  			adminfname="level";
		//  			adminlname="trading field";
		//  		}
		//  	}).catch(console.log.bind(console,"gotAdmin fail:"));	
		//  } // admin fname,lname doesn't matter
		
		options=options || {};

		//console.log("room",id,name,admin_id,publiclevel);
		// console.trace();
		
		var myUsers=makeFinder([]);

		this.gotUsers=function(){ 
			// console.log("getUsersInRoom",id);
			return pg.getUsersInRoom(id).then(function(users){
				// console.log("users in room",id,users.length,publiclevel);

				if (users.length < 2 && publiclevel == 2) {
					users.forEach(function(userRow){
						myUsers.add(userRow.id,userRow); // HACK - need users in here to kick them all when we destroy this.
					});

					console.log('removing room',id, publiclevel,users.length);
					self.destroyRoom(); 
					return;
				}

				users.forEach(function(userRow){
					myUsers.add(userRow.id,userRow);
				});

				users.forEach(function(userRow){ // HACK we h ave to do this again because otherwise the number of users will be wrong.
					if (userSockets[userRow.id]) {
						userSockets[userRow.id].forEach(function(socket){
							socket.join('Room'+id);
							if (options.announceOnline){
								renamePrivateRoom(self.toStruct(),userRow.id).then(function(cookedStruct){
									socket.emit('new room added', cookedStruct);
								}).catch(console.log);
							}
						});
					}
				});
				// console.log("users finished init",id,myUsers.toArray());
			}).catch(function(err) {
				console.log("chat gotUsers fail:",err);
			});
	    }

		this.getId=function(){return id;};
		this.id=id;  //WARNING: this should be read-only
		this.getAdmin=function(){return admin_id;}

		this.hasUser=function(user_id){ // well, shit.
			// console.log(user_id,myUsers.contains(user_id),myUsers.toArray().map(function(user){return user.id}));
			return myUsers.contains(user_id);
		}

		this.isPublic=function(){
			return (publiclevel === 0);
		}

		this.isPrivate=function(){
			return (publiclevel === 2);	
		}

		this.toStruct=function(){
			return {
				id:id,name:name,admin:admin_id,publiclevel:publiclevel,created:created,users:myUsers.toArray().map(function(user){return user.id})
			}
		}

		function tellTheRoomUserIsHere(user_id,room){
			io.to('Room'+id).emit('user added to room',{roomId:id,userId:user_id});
			//tell that user's sockets (if any) to join
			if (userSockets[user_id]) {
				userSockets[user_id].forEach(function(socket){
					socket.emit('new room added',room);
					socket.join('Room'+id);
				});
			}
		}

		function tellTheDatabaseUserIsHere(user_id){
			pg.addUserToRoom(id,user_id);
		}

		this.userChanged = function(user_id,fname,lname){ // TODO this doesn't work anymore.
			var self = this;
			myUsers.find(user_id).then(function(user){
				if (!user) return;
				myUsers.update(user_id,{id:user_id,fname:fname,lname:lname});
				self.addSystemMessage(user.fname+' '+user.lname+' changed their name to ' +fname+' '+lname);
			});	
		}

		this.userAdded=function(user_id,fname,lname){
			var self=this;
			myUsers.find(user_id)
				.then(function(){
					console.log("user already here?");
				},function(){
					console.log('adding user to room',user_id);
					myUsers.add(user_id,{id:user_id,fname:fname,lname:lname});
					tellTheRoomUserIsHere(user_id,self.toStruct());
					tellTheDatabaseUserIsHere(user_id);
					// tellTheUserTheyAreHere(user_id,this.toStruct());
					self.addSystemMessage(fname+' '+lname+' has joined the room');
				}).catch(console.log);
		}

		this.userKicked=function(user_id){
			tellTheUserTheyAreKicked(user_id);
		}

		function tellTheUserTheyAreKicked(user_id) {
			if (userSockets[user_id]){
				userSockets[user_id].forEach(function(socket){
					socket.emit('room kicked',id);
				});
			}
		}

		function tellTheRoomUserLeft(user_id){
			if (userSockets[user_id]) {
				userSockets[user_id].forEach(function(socket){
					socket.emit('room removed',id);
					socket.leave('Room'+id);
				});
			}
			io.to('Room'+id).emit('user removed from room',{roomId: id,userId:user_id});
		}

		function tellTheDatabaseUserLeft(user_id){
			pg.removeUserFromRoom(id,user_id).catch(function(err) {
				console.log('tellTheDatabaseUserLeft error',err);
			});
		}

		this.userLeft=function(user_id){
			var self=this;
			myUsers.find(user_id)
				.then(function(){
					myUsers.remove(user_id);
					if (myUsers.getCount() < 2 && publiclevel == 2) { //I'm a private room, and now there's less than 2 people here...
						console.log('destroying empty private room', self.getId());
						self.destroyRoom();
						return;
					}
					tellTheRoomUserLeft(user_id);
					tellTheDatabaseUserLeft(user_id);
					pg.getUserById(user_id).then(function(userData){
						self.addSystemMessage(userData.fname+' '+userData.lname+' has left the room');
					});
				}).catch(function(err) {
					console.log('userleft error',err);
				});
		}

		function tellTheRoomImDone(){
			io.to('Room'+id).emit('room removed',id);
			//iterate myUsers, iterate their sockets (if any) and leave this room
			myUsers.toArray().forEach(function(user){
				if (userSockets[user.id]){
					userSockets[user.id].forEach(function(socket){
						socket.emit('room removed',id);
						socket.leave('Room'+id);
					})
				}
			})			
		}

		function tellTheDatabaseImDone(){
			pg.deleteRoomByUser(id);
		}

		function tellTheLiveDataImDone(){
			removeRoom(self);
		}

		this.destroyRoom=function(){ // careful, this doesn't check if your user is an admin
			var self = this;

			console.log('destroyRoom',id);

			var userlist = myUsers.toArray
			for (var i in userlist) {
				console.log('kicking users',userlist[i]);
				tellTheDatabaseUserLeft(userlist[i]); // kick all users.
			}
			
			tellTheRoomImDone();
			tellTheDatabaseImDone();
			tellTheLiveDataImDone();
		}

		function tellTheRoomMessageSent(user_id,first_name, last_name, message){
			io.to('Room'+id).emit('chat message',{
				roomId:id,
				userId:user_id,
				from:first_name+' '+last_name,
				message:message,
				created:new Date()
			});
		}

		function tellTheDatabaseMessageSent(userid,roomid, message){
			pg.sendChatMessage(userid,roomid, message).catch(function(err) {
				console.log(err);
			});
		}

		this.addMessage=function(user_id,first_name,last_name,message,flag){
			// console.log("addMessage",user_id,first_name,last_name,message);

			if (flag){ //system message
				tellTheRoomMessageSent(0,'','',message);
				tellTheDatabaseMessageSent(0,id,message);
				return;
			}

			myUsers.find(user_id).then(function(user){
				// console.log(user,typeof user,typeof user == 'object');
				if (user && typeof user == 'object') {
					// console.log('new message: ',user_id,first_name,last_name,this.id,message,id);
					tellTheRoomMessageSent(user_id,first_name,last_name,message);
					tellTheDatabaseMessageSent(user_id,id,message);	
				} else {
					console.log('addMessage denied: user not in room.',user);
					return;
				}
			}).catch(function(err) {
				console.log('addMessage find user error: ',err);
			});
		}

		this.addSystemMessage = function(message){
			if (publiclevel !== 0) { // No system messages on public chats
				this.addMessage(0,'','',message,true);
			}
		} 

		function tellTheRoomNewName(name,oldName){
			io.to('Room'+id).emit('room name change',{roomId:id,name:name});
		}

		function tellTheDatabaseNewName(name){
			pg.changeRoomName(id,name);
		}

		this.rename=function(newName){
			var oldName=name;
			name=newName;
			tellTheRoomNewName(name,oldName);
			tellTheDatabaseNewName(name);
			this.addSystemMessage(oldName+' is now named '+newName);
		}
	}

	function makeRoom(roomRow){
		// console.log("makeRoom",roomRow.name);
		var ret;
		try{
			ret=new Room(roomRow.id,roomRow.name,roomRow.admin,roomRow.publiclevel,roomRow.created);
		}
		catch(e){
			console.log("makeRoom",roomRow,"fail");
		}
		return ret;
	}
	
	// no other_users
	return pg.getRooms().catch(function(err){ // load all the rooms.
		console.log("got Rooms failed");
		throw err;
	}).then(function(rooms){
		console.log("mapping rooms");
		rooms = rooms.map(makeRoom);
		
		console.log("rooms mapped, calling gotUsers on each");
		for (var i in rooms) {
			rooms[i].gotUsers();
		}
		// rooms.map(room=>room.gotUsers);

		console.log("all rooms gotten, attaching API objects");
		//return an interface for accessing the rooms
		var Rooms=makeFinder(rooms);

		// console.log(Rooms.toArray().map(room=>room.toStruct()))

		removeRoom=function(room){
			Rooms.remove(room.id);
			rooms=Rooms.toArray();
			console.log('removed room',room.id);
		}

		//creates a room in the database, then instantiates it, and adds it to the Rooms finder and rooms array
		function makeNewRoom(name,admin_id,other_users,publiclevel){
			// console.log(name,admin_id,other_users);

            // var publiclevel = 2;
            // if (other_users.length > 2) publiclevel = 1; // 2: Private, 1: group, 0: public

			return pg.createRoom(name,admin_id,publiclevel)
				.then(function(roomDetails){
					console.log('created new room:',other_users,roomDetails);

					var id = roomDetails[0].id;
					var created = roomDetails[0].created;
					var myRoom = new Room(id,name,admin_id,publiclevel,created,{announceOnline:true});  //this is our chance to let clients know about the room that got added
					
					var addUserToRoom = function(userid) {
						return pg.addUserToRoom(id, userid);
					}

					var promiseArray = other_users.map(addUserToRoom);

					Promise.all(promiseArray).then(function() {
						console.log('users added, attaching to chat module');
						rooms.push(myRoom);
						Rooms.add(id,myRoom);
						myRoom.gotUsers(); 
						return myRoom.toStruct();
					});
					
				}).catch(function(err) {
					console.log('create room error',err);
				});
		}

		function joinTo(socket,user){
			return function(room){
				socket.join('Room'+room.getId());
			}
		}

		function unJoin(socket){
			return function(room){
				socket.leave('Room'+room.getId());
			}
		}

		/*
		 *
		 *
		 *  This is the interface portion of the module.  This module is used by chatModule=require(thisModule)
            var chatModuleIsReady=chatModule.init() --> Promise
            the Promise resolves (if successful, to the below object, which has socketConnected(user,socket))
            which handles the socket operations of the chat for every user
         *
         *
         *
         */

		return {
			socketConnected:function(user,socket){
				//socket is connected, so we join that socket to all the rooms it needs to be connected to
				//console.log("registering socket with chat module");
				if (!user.id) return;
				userHasSocket(user,socket);

				var usersRooms=rooms.filter(hasUser(user.id));
				usersRooms.forEach(joinTo(socket,user));

				// usersRoomsAsStructs=usersRooms.map(toStruct).map(renamePrivateRoom(user.id));
				// Promise.all(usersRoomsAsStructs).then(function(retArray){
				// 	//console.log("---",retArray);
				// 	// console.log("rooms for",user,retArray);
				// 	socket.emit('rooms you are in',retArray); // wrong
				// });
				
				/*
				socket.on('disconnect',function(){
					usersRooms.forEach(unJoin(socket));
				});
				*/

				socket.on('chat message',function(opt,cb){
					Rooms.find(opt.roomId).then(function(room){
						room.addMessage(user.id,user.fname,user.lname,opt.message);
						if (cb) cb({message: 'success'});
					}).catch(function(err) {
						console.log(err);
						if (cb) cb({message: 'error',error:err});
					});
				});

				socket.on('join room',function(opt,cb){ // the only rooms you can just join like this are public.
					Rooms.find(opt.roomId).then(function(room){
						var publiclevel = room.isPublic();
						if (publiclevel === true) { // check public level
							socket.join('Room'+opt.roomId);
							room.userAdded(user.id,user.fname,user.lname);
							if (cb) cb(room.toStruct());
						} else {
							console.log('cant join room: wrong publiclevel',room,publiclevel);
			            	if (cb) cb("error: error2");
						}
					}).catch(function(err){
						console.log('cant join room:',err);
			            if (cb) cb("error: error1");
					});
				});

				socket.on('leave room',function(opt){
					socket.leave('Room'+opt.roomId);
				});

				socket.on('exit room',function(opt){
					console.log("exit room",opt);
					if (!opt || !opt.roomId) {
						return;
					}
					Rooms.find(opt.roomId).then(function(room){
						socket.leave('Room'+opt.roomId);
						room.userLeft(user.id);
					}).catch(console.log);;
				});

				socket.on('new room',function(data,cb){
					console.log('new room',data);
					// new room doesn't take an id from the client anymore.
					if (!data || !data.users) {
						console.log('new room error: no users or no data',data);
						if (cb) cb('error');
						return;
					} else if (typeof data.users == 'array') {
						console.log('new room error: users not an array',typeof data.users);
						if (cb) cb('error');
						return;
					} //else {
					// 	console.log('new room error: no users',data);
					// 	if (cb) cb('error');
					// 	return;
					// }
					if (!data.publiclevel) {
						console.log('new room error: no publiclevel',data);
						if (cb) cb('error');
						return;	
					}
					data.users.push(user.id); // add us to the array
		            data.publiclevel = Number(data.publiclevel);
					if (data.publiclevel === 0) { // prevent making public chats for now..
						console.log('new room error: attempt to make public chat',data);
						if (cb) cb('error');
						return;	
					} else if (isNaN(data.publiclevel)) {
						console.log('new room error: publiclevel not a number',data);
						if (cb) cb('error');
						return;	
					} else if (data.publiclevel > 2 || data.publiclevel < 0) {
						console.log('new room error: publiclevel out of range',data);
						if (cb) cb('error');
						return;	
					}

					makeNewRoom(data.title,user.id,data.users,data.publiclevel).then(function(room){
						if (cb) cb(room);
					}).catch(function(err) {
						console.log('makeNewRoom error',err);
						if (cb) cb(err);
					});			
				});

				socket.on('get rooms',function(opt){
					// socket.emit('rooms you are in', rooms.map(function(room){
					// 	return room.toStruct();
					// }));
					var rooms = Rooms.toArray().filter(function(room){
						return room.hasUser(user.id);
					}).map(function(room){
						if (room.isPrivate()) {
							return renamePrivateRoom(room.toStruct(),user.id);
						} else {
							return room.toStruct();
						}
					});
					Promise.all(rooms).then(function(data){
						console.log('get rooms',user.id);
						socket.emit('rooms you are in',data);
					});
				});

				socket.on('get public rooms',function(){
					// console.log("get public rooms",Rooms.toArray());
					var rooms = Rooms.toArray().filter(function(room){
						return room.isPublic();
					}).map(function(room){
						return room.toStruct();
					});
					// console.log("public rooms list",rooms);
					socket.emit('public rooms',rooms);
				});

				socket.on('remove user from room',function(opt){
					//console.log(opt,opt.roomId);
					Rooms.find(opt.roomId).then(function(room){
						if (room.getAdmin()==user.id){
							pg.getUserById(opt.userId).then(function(userData){ // system message here
								room.addSystemMessage(userData.fname+' '+userData.lname+' has been kicked from the room'); // get OUT
								room.userLeft(opt.userId);
								room.userKicked(opt.userId);
							});
						} else {
							socket.emit('error',{message: 'user kick not authorized'});
						}
					}).catch(console.log);

				});

				socket.on('add user to room',function(opt){
					//console.log("add user",opt);
					Rooms.find(opt.roomId).then(function(room){
						if (room.getAdmin()==user.id){
							pg.getUserById(opt.userId).then(function(touser){
								room.userAdded(opt.userId,touser.fname,touser.lname);
							});
						} else {
							socket.emit('error',{message: 'room invite not authorized'});
						}
					}).catch(console.log);
				});

				socket.on('delete room',function(opt){
					Rooms.find(opt.roomId).then(function(room){
						if (room.getAdmin()==user.id){
							room.destroyRoom(user);
						} else {
							console.log('unauthorized user '+user.id+' tried to delete '+opt.roomId);
							socket.emit('error',{message: 'delete room not authorized'});
						}
					}).catch(console.log);

				});

				socket.on('room name change',function(opt){
					Rooms.find(opt.roomId).then(function(room){
						if (room.getAdmin()==user.id){
							room.rename(opt.name);
						} else {
							socket.emit('error',{message: 'room name change not authorized'});
						}
					}).catch(console.log);
				});

		        // socket.on( 'delete room', function(data){ // TODO fix this up.
		        //     postgres.deleteRoomByUser(data.roomId, userData.id).then(function(success){
          //       		io.emit('room removed', data.roomId); // kick all users from room
          //   		});
        		// });
			}
		};
	},function(err){
		console.log("couldn't map rooms to room.gotUsers");
		throw err;
	});
}

module.exports={
	init:function(io,pg,isProduction){
		return ChatInit(io,pg,isProduction);
	}
};