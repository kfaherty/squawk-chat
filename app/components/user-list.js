import Ember from 'ember';

export default Ember.Component.extend({
  classNames: ['user-list-contain'],
  classNameBindings: ["isExpired:is-expired"],
  //  go to api
  model: [
      {
        name: 'hello'
      },{
        name: 'cool coolname'
      }
    ]
  
});
