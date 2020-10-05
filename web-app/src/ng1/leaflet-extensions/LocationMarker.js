var L = require('leaflet');

L.LocationMarker = L.Layer.extend({
  initialize: function (latlng, options) {
    L.setOptions(this, options);

    this._group = L.featureGroup();

    this._accuracyCircle = L.circle(latlng, 0, {
      clickable: false,
      color: options.color,
      fillColor: options.color,
      fillOpacity: 0.15,
      weight: 2,
      opacity: 0.5,
      pane: options.pane
    });

    this._locationMarker = L.circleMarker(latlng, {
      color: options.color,
      fillColor: options.color,
      fillOpacity: 0.7,
      weight: 2,
      opacity: 0.9,
      radius: 5,
      pane: options.pane
    });
    this._locationMarker.addEventParent(this);
    this._group.addLayer(this._locationMarker)

    if (options.iconUrl) {
      this._iconMarker = L.fixedWidthMarker(latlng, {
        pane: options.pane,
        iconUrl: options.iconUrl,
        iconWidth: 42
      });

      this._iconMarker.addEventParent(this);
      this._group.addLayer(this._iconMarker);
    }

    this.on('popupopen', () => {
      this._accuracyCircle.setRadius(this.options.accuracy);
      this._group.addLayer(this._accuracyCircle);
    });

    this.on('popupclose', () => {
      this._group.removeLayer(this._accuracyCircle);
    });
  },

  onAdd: function(map) {
    this._map = map;
    map.addLayer(this._group);
  },

  onRemove: function(map) {
    map.removeLayer(this._group);
  },

  getLatLng: function() {
    return this._locationMarker.getLatLng();
  },

  setLatLng: function (latlng) {
    this._accuracyCircle.setLatLng(latlng);
    this._locationMarker.setLatLng(latlng);
    if (this._iconMarker) {
      this._iconMarker.setLatLng(latlng);
    }

    return this;
  },

  setAccuracy: function (accuracy) {
    if (accuracy != null) {
      this._accuracyCircle.setRadius(accuracy);
    }

    return this;
  },

  getAccuracy: function() {
    return this._accuracyCircle;
  },

  setColor: function(color) {
    if (this._accuracyCircle.options.color === color) return this;

    const style = {color: color, fillColor: color};
    this._accuracyCircle.setStyle(style);
    this._locationMarker.setStyle(style);

    return this;
  }
});

L.locationMarker = function (latlng, options) {
  return new L.LocationMarker(latlng, options);
};
