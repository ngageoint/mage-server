/*
	L.Handler is a base cl***REMOVED*** for handler cl***REMOVED***es that are used internally to inject
	interaction features like dragging to cl***REMOVED***es like Map and Marker.
*/

L.Handler = L.Cl***REMOVED***.extend({
	initialize: function (map) {
		this._map = map;
	},

	enable: function () {
		if (this._enabled) { return; }

		this._enabled = true;
		this.addHooks();
	},

	disable: function () {
		if (!this._enabled) { return; }

		this._enabled = false;
		this.removeHooks();
	},

	enabled: function () {
		return !!this._enabled;
	}
});
