import Ember from 'ember';

export default Ember.Component.extend({
	classNames: ['chat-message'],
	classNameBindings: ["isMine:mine"],
	message: null,

	isMine: Ember.computed("message.mine", function() {
		let message = this.get("message");

		if ( message.mine ) {
			return true;
		}
		return false;
	})
});