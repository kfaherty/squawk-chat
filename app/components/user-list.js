import Ember from 'ember';

export default Ember.Component.extend({
  classNames: ['user-list-contain'],
  sortType: 'Newest First',
  //  go to api
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
  }
});
