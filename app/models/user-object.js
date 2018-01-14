import DS from 'ember-data';

export default DS.Model.extend({
	id: DS.attr(),
	name: DS.attr(),
	relativeTime: DS.attr(),
	status: DS.attr(),
	userStatus: DS.attr(),
	statusMessage: DS.attr(),
	friend: DS.attr(),
	bookmark: DS.attr(),
	snippet: DS.attr()
});
