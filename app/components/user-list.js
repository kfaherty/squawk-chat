import Ember from 'ember';

export default Ember.Component.extend({
  classNames: ['user-list-contain'],
  sortType: 'Newest First',
  selectedChat: '242174728147218941',

  // model: null,
  model: [
    {
      name: 'Cool Coolname',
      relativeTime: '11:45 pm',
      status: 0,
      userStatus: "Offline",
      statusMessage: null,
      friend: true,
      snippet: 'Hey dude Hope you are fine lorem ipsum Dolor sit amet, consectetur adipiscing elit, sed do magnaet ifsa nidsian kgskhg idshgi ingskngls klngds'
    },
    {
      name: 'Cool Coolname',
      relativeTime: '11:45 pm',
      status: 1,
      userStatus: "Online",
      statusMessage: 'Yo, just got home wow this is a long status',
      friend: false,
      bookmark: true,
      selected: true,
      snippet: 'Hey dude Hope you are fine lorem ipsum Dolor sit amet, consectetur adipiscing elit, sed do magnaet ifsa nidsian kgskhg idshgi ingskngls klngds'
    },
    {
      name: 'Cool Coolname',
      relativeTime: '11:45 pm',
      status: 2,
      userStatus: "Busy",
      statusMessage: null,
      friend: false,
      snippet: 'Hey dude Hope you are fine lorem ipsum Dolor sit amet, consectetur adipiscing elit, sed do magnaet ifsa nidsian kgskhg idshgi ingskngls klngds'
    }
  ],

  classNameBindings: [
    'showSortMenu:showSortMenu',
    'hideSearchLabel:hideSearchLabel'
  ],
  
  showSortMenu: false,
  hideSearchLabel: false,
  defaultValues: Ember.on('init', function(){
    //http://emberjs.com/api/classes/Ember.Object.html#method_set
    this.set("showSortMenu", false);
    this.set('hideSearchLabel',false);
  }),

  actions: {
    sortClicked: function(){
      this.set('showSortMenu',!this.get('showSortMenu'));
    },
    // TODO: refactor this to be a single function with a switch.
    // TODO: do sorting
    // TODO: render sorted list

    setNewestSort: function() {
      this.set('sortType','Newest First');
      this.set('showSortMenu',!this.get('showSortMenu')); 
    },
    setOldestSort: function() {
      this.set('sortType','Oldest First');
      this.set('showSortMenu',!this.get('showSortMenu')); 
    },
    setAlphaSort: function() {
      this.set('sortType','Alphabetical');
      this.set('showSortMenu',!this.get('showSortMenu')); 
    },
    setTypeSort: function() {
      this.set('sortType','Type');
      this.set('showSortMenu',!this.get('showSortMenu')); 
    },
    updateSearch: function(value) {
      // console.log(value);
      if (value && value.length) {
        this.set('hideSearchLabel',true); 
      } else {
        this.set('hideSearchLabel',false); 
      }

      // TODO do search in here.
      // TODO render only search results
      // TODO move this to its own component and use yield results
      // https://guides.emberjs.com/v2.18.0/tutorial/autocomplete-component/
    }
  },

  // socket

  /*
    1. First step you need to do is inject the socketio service into your object.
  */
  socketIOService: Ember.inject.service('socket-io'),

  /*
    Important note: The namespace is an implementation detail of the Socket.IO protocol...
    http://socket.io/docs/rooms-and-namespaces/#custom-namespaces
  */
  namespace: 'chat',

  didInsertElement() {
    this._super(...arguments);

    /*
      2. The next step you need to do is to create your actual socketIO.
    */
    const socket = this.get('socketIOService').socketFor('http://localhost:7000/' + this.get('namespace'));

    /*
    * 3. Define any event handlers
    */
    socket.on('connect', this.onConnect, this);
    socket.on('message', this.onMessage, this);

    /*
      4. It is also possible to set event handlers on specific events
    */
    socket.on('myCustomEvent', () => { socket.emit('anotherCustomEvent', 'some data'); });
  },

  onConnect() {
    const socket = this.get('socketIOService').socketFor('http://localhost:7000/' + this.get('namespace'));

    /*
      There are 2 ways to send messages to the server: send and emit
    */
    socket.send('Hello World');
    socket.emit('Hello server');
  },

  onMessage(data) {
    // This is executed within the ember run loop
  },

  myCustomEvent(data) {
    const socket = this.get('socketIOService').socketFor('http://localhost:7000/' + this.get('namespace'));
    socket.emit('anotherCustomEvent', 'some data');
  },

  willDestroyElement() {
    this._super(...arguments);

    const socket = this.get('socketService').socketFor('http://localhost:7000/' + this.get('namespace'));
    socket.off('connect', this.onConnect);
    socket.off('message', this.onMessage);
    socket.off('myCustomEvent', this.myCustomEvent);
  }
});
