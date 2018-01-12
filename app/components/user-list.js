import Ember from 'ember';

export default Ember.Component.extend({
  classNames: ['user-list-contain'],
  classNameBindings: ["isExpired:is-expired"],
  sortType: 'Newest First',
  //  go to api
  model: [
      {
        name: 'hello'
      },{
        name: 'cool coolname'
      }
    ]
  
});
