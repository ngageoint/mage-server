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
		$(container).find('a').on('click', stop);

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

// L.Control.SideBar = L.Control.extend({

// 	options: {
// 		position: 'sideleftbar'
// 	},

// 	initialize: function(options) {
// 		L.Control.prototype.initialize.call(this, options);
// 	},

// 	onAdd: function (map) {
//         // create the control container with a particular cl***REMOVED*** name
//         var container = L.DomUtil.get('side-bar');
//         var stop = L.DomEvent.stopPropagation;
// 		$(container).find('a').on('dblclick', stop);

//         // ... initialize other DOM elements, add listeners, etc.

//         return container;
//     }
// });

L.Control.TimeScale = L.Control.extend({

	options: {
		position: 'bottomleft'
	},

	initialize: function(options) {
		L.Control.prototype.initialize.call(this, options);
	},

	onAdd: function(map) {
		var container = L.DomUtil.get('time-scale');
        var stop = L.DomEvent.stopPropagation;
		$(container).find('a').on('click', stop);
		$(container).find('a').on('mousedown', stop);
		$(container).find('a').on('mouseup', stop);
        // ... initialize other DOM elements, add listeners, etc.

        return container;
	}
});
