import Ember from 'ember';

export default Ember.Component.extend({
  classNames: ['user-list-contain'],
  sortType: 'Newest First',
  //  go to api
  model: [
    {
      name: 'Cool Coolname',
      relativeTime: '11:45 pm',
      type: 'Private Message',
      friend: true,
      snippet: 'Hey dude Hope you are fine lorem ipsum Dolor sit amet, consectetur adipiscing elit, sed do magnaet ifsa nidsian kgskhg idshgi ingskngls klngds'
    },
    {
      name: 'Cool Coolname',
      relativeTime: '11:45 pm',
      type: 'Private Message',
      friend: false,
      bookmark: true,
      snippet: 'Hey dude Hope you are fine lorem ipsum Dolor sit amet, consectetur adipiscing elit, sed do magnaet ifsa nidsian kgskhg idshgi ingskngls klngds'
    },
    {
      name: 'Cool Coolname',
      relativeTime: '11:45 pm',
      type: 'Private Message',
      selected: true,
      friend: false,
      snippet: 'Hey dude Hope you are fine lorem ipsum Dolor sit amet, consectetur adipiscing elit, sed do magnaet ifsa nidsian kgskhg idshgi ingskngls klngds'
    }
  ],
});
