import Ember from 'ember';

export default Ember.Component.extend({
	classNames: ['user-object'],
	classNameBindings: ["isSelected:selected"],
	
	user: null,
	
	isSelected: Ember.computed("user.selected", function() {
		let user = this.get("user");

		if ( user.selected ) {
			return true;
		}
		return false;
	})
});
