L.Control.MageFeature = L.Control.extend({
	options: {
		position: 'topleft',
		enabled: true
	},

	onAdd: function (map) {
		var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
		this._link = L.DomUtil.create('a', '', container);
		this._icon = L.DomUtil.create('i', 'fa fa-map-marker icon-sage', this._link);

		this._link.href = '#';
		this._link.title = 'New Observation';

		L.DomEvent
			.on(this._link, 'mousedown dblclick', L.DomEvent.stopPropagation)
			.on(this._link, 'click', L.DomEvent.stop)
			.on(this._link, 'click', this._onClick, this);

    return container;
  },

	_onClick: function() {
		if (this.options.onClick) {
			this.options.onClick(this._map.getCenter());
		}
	}
});

L.Control.MageUserLocation = L.Control.extend({
	options: {
		position: 'topleft',
		enabled: true
	},

	onAdd: function (map) {
		var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');

		this._locateLink = L.DomUtil.create('a', '', container);
		this._locateIcon = L.DomUtil.create('i', 'fa fa-location-arrow icon-sage', this._locateLink);
		this._locateLink.href = '#';
		this._locateLink.title = 'Locate Me';
		this._locate = false;
		this._location = null;
		map.on('locationfound', this._onLocation, this);

		L.DomEvent
			.on(this._locateLink, 'mousedown dblclick', L.DomEvent.stopPropagation)
			.on(this._locateLink, 'click', L.DomEvent.stop)
			.on(this._locateLink, 'click', this._onLocateClick, this);

		this._broadcastLink = L.DomUtil.create('a', '', container);
		this._broadcastIcon = L.DomUtil.create('i', 'icon-megaphone icon-sage', this._broadcastLink);
		this._broadcastLink.href = '#';
		this._broadcastLink.title = 'Locate Me';
		this._broadcast = false;

		L.DomEvent
			.on(this._broadcastLink, 'mousedown dblclick', L.DomEvent.stopPropagation)
			.on(this._broadcastLink, 'click', L.DomEvent.stop)
			.on(this._broadcastLink, 'click', this._onBroadcastClick, this);

    return container;
  },

	_startLocate: function() {
		this._map.locate({
			watch: true,
			setView: false,
		});
	},

	_stopLocate: function() {
		this._map.stopLocate();
		this._location = null;

		if (this.options.stopLocation) {
			this.options.stopLocation();
		}
	},

	_onLocation: function(location, broadcast) {
		if (!location) return;
		broadcast = broadcast || this._broadcast;

		this._location = location;

		if (this.options.onLocation) {
			this.options.onLocation(location, broadcast);
		}
	},

	_onLocateClick: function() {
		if (this._locate) {
			this._stopLocate();
			L.DomUtil.removeCl***REMOVED***(this._locateLink, 'btn-inverse');
			L.DomUtil.addCl***REMOVED***(this._locateIcon, 'icon-sage');
			L.DomUtil.removeCl***REMOVED***(this._locateIcon, 'icon-sage-inverse');
		} else {
			this._startLocate();
			L.DomUtil.addCl***REMOVED***(this._locateLink, 'btn-inverse');
			L.DomUtil.addCl***REMOVED***(this._locateIcon, 'icon-sage-inverse');
			L.DomUtil.removeCl***REMOVED***(this._locateIcon, 'icon-sage');
		}

		this._locate = !this._locate;
	},

	_onBroadcastClick: function() {
		if (!this._locate) this._onLocateClick();

		if (this._broadcast) {
			L.DomUtil.removeCl***REMOVED***(this._broadcastLink, 'btn-inverse');
			L.DomUtil.addCl***REMOVED***(this._broadcastIcon, 'icon-sage');
			L.DomUtil.removeCl***REMOVED***(this._broadcastIcon, 'icon-sage-inverse');
		} else {
			this._onLocation(this._location, true);

			L.DomUtil.addCl***REMOVED***(this._broadcastLink, 'btn-inverse');
			L.DomUtil.addCl***REMOVED***(this._broadcastIcon, 'icon-sage-inverse');
			L.DomUtil.removeCl***REMOVED***(this._broadcastIcon, 'icon-sage');
		}

		this._broadcast = !this._broadcast;
	},

	_broadcast: function() {
		if (!this._location || !this.options.onBroadcast) return;
		this.options.onBroadcast(this._location);
	}
});

L.Control.MageListTools = L.Control.extend({
	options: {
		position: 'topleft',
		enabled: true
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
	}
});
