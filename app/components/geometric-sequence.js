import Ember from 'ember';

export default Ember.Component.extend({

  init: function(){
    this.initializeSequence();
    this._super();
  },

  initializeSequence: function(){
    //geometric sequence of ^2: 1, 2, 4, 8, 16, etc...
    this.set("geometricSequence", Ember.A([1, 2, 4]));
  },

  classNames: ["geometric-sequence"],

  //set in component initializer
  geometricSequence: null,

  //reverse sequence is rendered in geometric-sequence.hbs
  reverseSequence: Ember.computed('geometricSequence', 'geometricSequence.@each', function() {
    // console.log('ok');
    let sequence = this.get("geometricSequence");
    var reverse = Ember.copy(sequence).reverse();

    //reverse the array here

    return reverse;
  }),

  actions:{
    updateSequence: function(){
      let sequence = this.get("geometricSequence");
      // alert("Trying to update sequence (You can remove this alert)");

      //Modify the sequence here

      // check length 
      if ( sequence.length >= 10 ) {
        // remove smallest

        // let smallestValue = Infinity;
        // let smallestIndex = 0;
        // sequence.forEach(function(item, index) {
        //   if (item < smallestValue) {
        //     smallestValue = item;
        //     smallestIndex = index;
        //   }
        // });
        // sequence.splice(smallestIndex,1);

        sequence.shiftObject(); // this can be shift since we know it's always going to be the last.
      }
      
      let newValue = sequence[sequence.length-1] * 2;
      if ( newValue > Math.pow(2,15) ) { // reset sequence
        this.initializeSequence();
      } else { // add new number.
        sequence.pushObject(newValue);
      }
    }
  }
});