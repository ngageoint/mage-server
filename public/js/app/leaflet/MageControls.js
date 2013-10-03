L.Control.MageFeature = L.Control.extend({

	options: {
		position: 'topleft'
	},

	initialize: function(options) {
		L.Control.prototype.initialize.call(this, options);
	},

	onAdd: function (map) {
        // create the control container with a particular cl***REMOVED*** name
        var container = L.DomUtil.get('new-feature-toolbar');

		var stop = L.DomEvent.stopPropagation;
		$(container).find('a').on('dblclick', stop);
		// also stop the click so that the new marker does not show up right behind the toolbar
		$(container).find('a').on('click', stop);

        return container;
    }
});

L.Control.MageUserLocation = L.Control.extend({

	options: {
		position: 'topleft'
	},

	initialize: function(options) {
		L.Control.prototype.initialize.call(this, options);
	},

	onAdd: function (map) {
        // create the control container with a particular cl***REMOVED*** name
        var container = L.DomUtil.get('user-location-toolbar');
        var stop = L.DomEvent.stopPropagation;
		$(container).find('a').on('dblclick', stop);

        // ... initialize other DOM elements, add listeners, etc.

        return container;
    }
});

L.Control.MageListTools = L.Control.extend({

	options: {
		position: 'topleft'
	},

	initialize: function(options) {
		L.Control.prototype.initialize.call(this, options);
	},

	onAdd: function (map) {
        // create the control container with a particular cl***REMOVED*** name
        var container = L.DomUtil.get('list-tool-toolbars');
        var stop = L.DomEvent.stopPropagation;
		$(container).find('a').on('dblclick', stop);

        // ... initialize other DOM elements, add listeners, etc.

        return container;
    }
});