var L = require('leaflet');

L.ObservationMarker = L.FixedWidthMarker.extend({
  initialize: function (latlng, options) {
    L.FixedWidthMarker.prototype.initialize.call(this, latlng, options);

    L.setOptions(this, options);

    this._accuracyCircle = L.circle(latlng, 0, {
      clickable: false,
      color: '#1565C0',
      fillColor: '#1E88E5',
      fillOpacity: 0.15,
      weight: 2,
      opacity: 0.5,
      pane: options.pane
    });

    this.on('popupopen', () => {
      if (this.options.accuracy) {
        this._accuracyCircle.setRadius(this.options.accuracy);
        this._map.addLayer(this._accuracyCircle);
      }
    });

    this.on('popupclose', () => {
      this._map.removeLayer(this._accuracyCircle);
    });
  },

  onRemove: function (map) {
    L.FixedWidthMarker.prototype.onRemove.call(this, map);

    map.removeLayer(this._accuracyCircle);
  },

  setAccuracy: function (accuracy) {
    this.options.accuracy = accuracy;
    return this;
  }
});

L.observationMarker = function (latlng, options) {
  return new L.ObservationMarker(latlng, options);
};
