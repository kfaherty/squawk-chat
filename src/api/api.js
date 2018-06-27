// import openSocket from 'socket.io-client';
import Cookies from 'universal-cookie';
const cookies = new Cookies();

// prod
// const socket = openSocket('http://138.197.170.47');
// dev
// const socket = openSocket('http://localhost/'); 

// read cookie and check token
function doSessionToken(cb) { // this happens automatically now.
  console.log('my token',cookies.get('user')); //
  let cookiedata = cookies.get('user')

  var getToken = function() {
    socket.emit('getToken',{},function(data) { 
      console.log('get token',data);
      cookies.set('user', data);
    });
  }

  if (cookiedata) {
    socket.emit('checkToken',cookiedata.token,function(data) {
      console.log(data);
      if (data === 'bad format') { // if error:
        console.log('token rejected');
        getToken();
        return;
      } 

      console.log('token accepted',data);
      // ok we know who you are..
    });
  } else {
    getToken();
  }
}

// connection status bar
function gainedConnectionAlert(cb) {
  socket.on('reconnect', () => cb(null,true));
  socket.on('connect', () => cb(null,true));
}
function lostConnectionAlert(cb) {
  socket.on('disconnect', () => cb(null,false));
  socket.on('error', () => cb(null,false));
  socket.on('connect_timeout', () => cb(null,false));
  socket.on('connect_failed', () => cb(null,false));
  socket.on('connect_error', () => cb(null,false));
}


// auth
socket.on('sessiontoken',function(data){
    console.log('get token',data);
    cookies.set('sessiontoken', data, { path: '/' });
});

socket.once('twittertoken',function(data){
    console.log('get twitter details',data)
    loginPromiseResolve(data);
});

var loginPromiseResolve;
var loginPromise = new Promise(function(resolve,reject) {
  loginPromiseResolve = resolve;
});

function gotTwitterLoginPromise() {
  return loginPromise;
}

function getRequestToken() {
  return new Promise(function(resolve,reject) {
    socket.emit('getrequesttoken',{},function(data) {
      console.log('got getRequestToken',data);
      if (data === 'error') {
        return reject();
      }
      resolve(data);
    });
  });
}

var usersCache = [];
function fetchUserByName(screen_name) {
  return new Promise( function(resolve,reject ) {
  	console.log('fetch user',screen_name);
  	if (!screen_name){ 
      reject('missing data');
  		// cb(null, undefined);
  		return
  	};

    if (usersCache[screen_name]) {
      console.log('return cache');
      resolve(usersCache[screen_name]);
      return;
    }
  	socket.emit('getuser',{screen_name:screen_name},function(data) {
  		console.log('got user data',data);
      if (!data || data==='unauthorized' || data==='error') {
			// cb(null, undefined);
  	// 		return;
        reject('error');
        return;
  		}
  		// return data;
  		// cb(null, data);
      usersCache[screen_name] = data; // cache the result.
      resolve(data);
  	});
  })
}

export { doSessionToken, getRequestToken };