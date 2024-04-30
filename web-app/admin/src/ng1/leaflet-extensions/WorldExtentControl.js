var L = require('leaflet');

L.Control.worldExtent = L.Control.extend({
  options: {
    position: 'topright',
    enabled: true
  },

  onAdd: function () {
    var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    this._link = L.DomUtil.create('a', '', container);

    this._icon = L.DomUtil.create('i', 'fa fa-globe icon-mage', this._link);

    this._link.href = '#';
    this._link.title = 'World extent';

    L.DomEvent
      .on(this._link, 'mousedown dblclick', L.DomEvent.stopPropagation)
      .on(this._link, 'click', L.DomEvent.stop)
      .on(this._link, 'click', this._zoomToWorldExtent, this);

    return container;
  },

  _zoomToWorldExtent: function () {
    this._map.fitWorld();
  }
});

L.control.worldExtent = function (options) {
  return new L.Control.worldExtent(options);
};
