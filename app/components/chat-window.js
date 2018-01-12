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
			}
		]
    },
  	
});