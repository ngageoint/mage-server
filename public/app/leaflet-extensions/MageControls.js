var L = require('leaflet');

L.Control.MageFeature = L.Control.extend({
  options: {
    position: 'topleft',
    enabled: true
  },

  onAdd: function () {
    var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    this._link = L.DomUtil.create('a', '', container);
    this._icon = L.DomUtil.create('i', 'material-icons leaflet-mage-icon', this._link);
    this._icon.innerHTML = 'add_location';

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
    this._locateIcon = L.DomUtil.create('i', 'material-icons leaflet-mage-icon', this._locateLink);
    this._locateIcon.innerHTML = 'near_me';
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
    this._broadcastIcon = L.DomUtil.create('i', 'material-icons leaflet-mage-icon', this._broadcastLink);
    this._broadcastIcon.innerHTML = 'my_location';
    this._broadcastLink.href = '#';
    this._broadcastLink.title = 'Report Location';
    this._broadcast = false;

    L.DomEvent
      .on(this._broadcastLink, 'mousedown dblclick', L.DomEvent.stopPropagation)
      .on(this._broadcastLink, 'click', L.DomEvent.stop)
      .on(this._broadcastLink, 'click', this._onBroadcastClick, this);

    return container;
  },

  startBroadcast: function() {
    if (this._broadcast) return; // broadcast is already on

    this._broadcast = true;
    this._onLocation(this._location);
    this.startLocate();

    L.DomUtil.addClass(this._broadcastLink, 'leaflet-control-inverse');
    L.DomUtil.addClass(this._broadcastIcon, 'leaflet-mage-icon-inverse');
    L.DomUtil.removeClass(this._broadcastIcon, 'leaflet-mage-icon');
  },

  stopBroadcast: function() {
    if (!this._broadcast) return; // broadcast already off

    L.DomUtil.removeClass(this._broadcastLink, 'leaflet-control-inverse');
    L.DomUtil.addClass(this._broadcastIcon, 'leaflet-mage-icon');
    L.DomUtil.removeClass(this._broadcastIcon, 'leaflet-mage-icon-inverse');

    this._broadcast = false;
  },

  startLocate: function() {
    if (this._locate) return; // locate is already on

    this._locate = true;

    this._map.locate({
      watch: true,
      setView: false
    });

    L.DomUtil.addClass(this._locateLink, 'leaflet-control-inverse');
    L.DomUtil.addClass(this._locateIcon, 'leaflet-mage-icon-inverse');
    L.DomUtil.removeClass(this._locateIcon, 'leaflet-mage-icon');
  },

  stopLocate: function() {
    if (!this._locate) return;  // locate is already off

    this._locate = false;

    this._map.stopLocate();
    this._location = null;

    if (this.options.stopLocation) {
      this.options.stopLocation();
    }

    L.DomUtil.removeClass(this._locateLink, 'leaflet-control-inverse');
    L.DomUtil.addClass(this._locateIcon, 'leaflet-mage-icon');
    L.DomUtil.removeClass(this._locateIcon, 'leaflet-mage-icon-inverse');

    this.stopBroadcast();
  },

  _onLocation: function(location) {
    if (!location) return;

    this._location = location;

    if (this.options.onLocation) {
      this.options.onLocation(location, this._broadcast);
    }
  },

  _onLocateClick: function() {
    if (this._locate) {
      this.stopLocate();
    } else {
      this.startLocate();
    }
  },

  _onBroadcastClick: function() {
    var self = this;
    this.options.onBroadcastLocationClick(function(hasPermission) {
      if (!hasPermission) return;

      if (self._broadcast) {
        self.stopBroadcast.apply(self);
      } else {
        self.startBroadcast.apply(self);
      }
    });
  }
});

L.Control.MageListTools = L.Control.extend({
  options: {
    position: 'topleft',
    enabled: true
  },

  onAdd: function () {
    var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    var linkClass = this.options.enabled ? 'leaflet-control-inverse' : '';
    this._link = L.DomUtil.create('a', linkClass, container);

    var iconClass = this.options.enabled ? 'material-icons leaflet-mage-icon-inverse' : 'material-icons leaflet-mage-icon';
    this._icon = L.DomUtil.create('i', iconClass, this._link);
    this._icon.innerHTML = 'menu';

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

  hideFeed: function(hide) {
    var hidden = L.DomUtil.hasClass(this._icon, 'leaflet-mage-icon');
    if (hidden === hide) return;

    if (hidden) {
      L.DomUtil.addClass(this._link, 'leaflet-control-inverse');
      L.DomUtil.addClass(this._icon, 'leaflet-mage-icon-inverse');
      L.DomUtil.removeClass(this._icon, 'leaflet-mage-icon');
    } else {
      L.DomUtil.removeClass(this._link, 'leaflet-control-inverse');
      L.DomUtil.addClass(this._icon, 'leaflet-mage-icon');
      L.DomUtil.removeClass(this._icon, 'leaflet-mage-icon-inverse');
    }
  },

  _toggle: function () {
    var on = L.DomUtil.hasClass(this._icon, 'leaflet-mage-icon-inverse');
    if (on) {
      L.DomUtil.removeClass(this._link, 'leaflet-control-inverse');
      L.DomUtil.addClass(this._icon, 'leaflet-mage-icon');
      L.DomUtil.removeClass(this._icon, 'leaflet-mage-icon-inverse');
    } else {
      L.DomUtil.addClass(this._link, 'leaflet-control-inverse');
      L.DomUtil.addClass(this._icon, 'leaflet-mage-icon-inverse');
      L.DomUtil.removeClass(this._icon, 'leaflet-mage-icon');
    }

    if (this.options.onToggle) {
      this.options.onToggle(!on);
    }
  }
});
