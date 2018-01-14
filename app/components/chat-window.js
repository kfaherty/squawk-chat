import Ember from 'ember';

export default Ember.Component.extend({
	classNames: ['chat-window'],
 	chat: {
		title: 'Cool Coolname',
		subtitle: 'Online: Yo, just got home wow this is a long status',
		private: true,
		messages: [
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'This doesnt seem to work..'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Oh. Weird. Nevermind.'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Cool'
			},
			{
				from: 'I sent this one',
				timestamp: '11:45 pm',
				mine: true,
				message: 'Hello'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Yep'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'This doesnt seem to work..'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Oh. Weird. Nevermind.'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Cool'
			},
			{
				from: 'I sent this one',
				timestamp: '11:45 pm',
				mine: true,
				message: 'Hello'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Yep'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'This doesnt seem to work..'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Oh. Weird. Nevermind.'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'There should be like.. timestamps between messages if the date changes.'
			},
			{
				from: 'I sent this one',
				timestamp: '11:45 pm',
				mine: true,
				message: 'Yeah I coded that on the last one. Probably can just use whatever I did there.'
			},
			{
				from: 'I sent this one',
				timestamp: '11:45 pm',
				mine: true,
				message: 'lol the database is refusing connections now. Use pg pools I guess..'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Are you going to fix the usernames?'
			},
		]
    },
  	classNameBindings: [
  		'showWidgetMenu:showWidgetMenu',
  		'hideTextLabel:hideTextLabel'
  	],
  	showWidgetMenu: false,
	hideTextLabel: false,
	defaultWidgetClosed: Ember.on('init', function(){
	    //http://emberjs.com/api/classes/Ember.Object.html#method_set
    	this.set("showWidgetMenu", false);
	    this.set('hideTextLabel',false);
  	}),
  	actions: {
		widgetClicked: function(){
			this.set('showWidgetMenu',!this.get('showWidgetMenu'));
		},
		closeChatClicked: function() {
			this.set('chat',null);

			this.set('showWidgetMenu',!this.get('showWidgetMenu'));	
		},
	    updateTextarea: function(value) {
	      // console.log(value);
	      if (value && value.length) {
	        this.set('hideTextLabel',true); 
	      } else {
	        this.set('hideTextLabel',false); 
	      }
	    }
	}
});