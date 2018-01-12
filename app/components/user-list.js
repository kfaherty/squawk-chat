import Ember from 'ember';

export default Ember.Component.extend({
  classNames: ['credit-card', 'text-left'],
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
