import Ember from 'ember';

export default Ember.Component.extend({
  classNames: ['user-list-contain'],
  sortType: 'Newest First',
  selectedChat: '242174728147218941',

  model: null,

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
    }
  },

  // socket
  websockets: Ember.inject.service(),
  socketRef: null,

  didInsertElement() {
    this._super(...arguments);

    /*
      2. The next step you need to do is to create your actual websocket. Calling socketFor
      will retrieve a cached websocket if one exists or in this case it
      will create a new one for us.
    */
    const socket = this.get('websockets').socketFor('wss://localhost:8799/');

    /*
      3. The next step is to define your event handlers. All event handlers
      are added via the `on` method and take 3 arguments: event name, callback
      function, and the context in which to invoke the callback. All 3 arguments
      are required.
    */
    socket.on('open', this.myOpenHandler, this);
    socket.on('message', this.myMessageHandler, this);
    socket.on('close', this.myCloseHandler, this);

    this.set('socketRef', socket);
  },

  willDestroyElement() {
    this._super(...arguments);

    const socket = this.get('socketRef');

    /*
      4. The final step is to remove all of the listeners you have setup.
    */
    socket.off('open', this.myOpenHandler);
    socket.off('message', this.myMessageHandler);
    socket.off('close', this.myCloseHandler);
  },

  myOpenHandler(event) {
    console.log(`On open event has been called: ${event}`);
  },

  myMessageHandler(event) {
    console.log(`Message: ${event.data}`);
  },

  myCloseHandler(event) {
    console.log(`On close event has been called: ${event}`);
  },

  // actions: {
  //   sendButtonPressed() {
  //     const socket = this.get('socketRef');
  //     socket.send('Hello Websocket World');
  //   }
  // }

});
