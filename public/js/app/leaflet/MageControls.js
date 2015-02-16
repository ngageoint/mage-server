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
		var button = $(container).find('a');
		button.on('dblclick', stop);
		// also stop the click so that the new marker does not show up right behind the toolbar
		$(container).find('a').on('click', stop);

		var onClick = this.options.onClick;
		if (onClick) button.on('click', function() {
			onClick(map.getCenter());
		});

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

    return container;
  }
});

L.Control.MageListTools = L.Control.extend({

	options: {
		position: 'topleft',
		enabled: true
	},

	initialize: function(options) {
		L.Control.prototype.initialize.call(this, options);
	},

	onAdd: function (map) {
		var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
		var linkCl***REMOVED*** = this.options.enabled ? 'btn-inverse' : '';
		this._link = L.DomUtil.create('a', linkCl***REMOVED***, container);

		var iconCl***REMOVED*** = this.options.enabled ? 'fa fa-bars icon-sage-inverse' : 'fa fa-bars icon-sage';
		this._icon = L.DomUtil.create('i', iconCl***REMOVED***, this._link);

		this._link.href = '#';
		this._link.title = 'Feed';

		L.DomEvent
			.on(this._link, 'mousedown dblclick', L.DomEvent.stopPropagation)
			.on(this._link, 'click', L.DomEvent.stop)
			.on(this._link, 'click', this._toggle, this);

		if (this.options.onClick) {
			L.DomEvent.on(this._link, 'click', this.options.onClick);
		}

    return container;
  },

	_toggle: function () {
		var on = L.DomUtil.hasCl***REMOVED***(this._icon, 'icon-sage-inverse');
		if (on) {
			L.DomUtil.removeCl***REMOVED***(this._link, 'btn-inverse');
			L.DomUtil.addCl***REMOVED***(this._icon, 'icon-sage');
			L.DomUtil.removeCl***REMOVED***(this._icon, 'icon-sage-inverse');
		} else {
			L.DomUtil.addCl***REMOVED***(this._link, 'btn-inverse');
			L.DomUtil.addCl***REMOVED***(this._icon, 'icon-sage-inverse');
			L.DomUtil.removeCl***REMOVED***(this._icon, 'icon-sage');
		}
	},
});
