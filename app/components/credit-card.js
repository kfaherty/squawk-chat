import Ember from 'ember';

export default Ember.Component.extend({

  setCurrentDate: Ember.on('init', function(){
    //override `today` property for integration tests
    if (!this.get("today")) {
      this.set('today', new Date());
    }
  }),

  today: null,
  card: null,
  classNames: ['credit-card', 'text-left'],

  // this should be is-expired if you want the tests to work..
  //binds class name of 'is-expire' when the `isExpired` property is true.
  classNameBindings: ["isExpired:is-expired"],

  //returns true if `card` is expired, otherwise returns false.
  isExpired: Ember.computed("card.expirationMonth", "card.expirationYear", function() {
    let card = this.get("card");

    // if ( !card.expirationMonth || !card.expirationYear ) { // missing data.
    //   console.error('missing credit card expiration data',card);
    //   return false;
    // } 

    let today = this.get("today");
    let date = new Date( card.expirationYear,(Number(card.expirationMonth) ),0,23,59,59 ); // last day in expiration year & month.
    
    if (date.getTime() < today.getTime() ) {
      return true;
    }
    return false;
  })
/*

  exampleCard: {
    type: "Visa",
    accountNumber: 1234567890123456,
    name: "Jeremy Smith",
    expirationMonth: "12",
    expirationYear: "2016"
  },

*/
});
