L.LocationMarker = L.Marker.extend({
  initialize: function (latlng, options) {
    L.Marker.prototype.initialize.call(this, latlng);

    this._accuracyCircle = L.circle(latlng, 0, {
      clickable: false,
      color: options.color,
      fillColor: options.color,
      fillOpacity: 0.15,
      weight: 2,
      opacity: 0.5
    });

    this._locationMarker = L.circleMarker(latlng, {
      color: options.color,
      fillColor: options.color,
      fillOpacity: 0.7,
      weight: 2,
      opacity: 0.9,
      radius: 5
    });

    var group = [this._accuracyCircle, this._locationMarker];

    if (options.iconUrl) {
      this._iconMarker = L.marker(latlng, {
        clickable: true,
        icon: L.icon({iconUrl: options.iconUrl, iconSize: [42, 42], iconAnchor: [21, 42]})
      });

      L.DomEvent.on(this._locationMarker, 'click', function() {
        this._iconMarker.openPopup();
      }, this);

      group.push(this._iconMarker);
    }

    this._location = L.layerGroup(group);
  },

  addTo: function (map) {
    map.addLayer(this._location);
    return this;
  },

  onAdd: function (map) {
    this._map = map;
    map.addLayer(this._location);

    L.DomEvent.on(this._locationMarker, 'click', this._onMouseClick, this);
  },

  onRemove: function (map) {
    map.removeLayer(this._location);
  },

  getLatLng: function() {
    return this._locationMarker.getLatLng();
  },

  setLatLng: function (latlng) {
    this._accuracyCircle.setLatLng(latlng);
    this._locationMarker.setLatLng(latlng);
    if (this._iconMarker) this._iconMarker.setLatLng(latlng);

    return L.Marker.prototype.setLatLng.call(this, latlng);
  },

  setAccuracy: function (accuracy) {
    this._accuracyCircle.setRadius(accuracy ? accuracy : 0);
    return this;
  },

  getAccuracy: function() {
    return this._accuracyCircle;
  },

  setColor: function(color) {
    if (this._accuracyCircle.options.color == color) return this;

    // this._accuracyCircle.options.color = color;
    // this._accuracyCircle.options.fillColor = color;
    // this._locationMarker.options.color = color;
    // this._locationMarker.options.fillColor = color;

    var style = {color: color, fillColor: color};
    this._accuracyCircle.setStyle(style);
    this._locationMarker.setStyle(style);

    return this;
  },

  _onMouseClick: function (e) {
    var wasDragged = this.dragging && this.dragging.moved();

    if (this.hasEventListeners(e.type) || wasDragged) {
      L.DomEvent.stopPropagation(e);
    }

    if (wasDragged) { return; }

    if ((!this.dragging || !this.dragging._enabled) && this._map.dragging && this._map.dragging.moved()) { return; }

    this.fire(e.type, {
      originalEvent: e,
      latlng: this._latlng
    });
  }

});

L.locationMarker = function (latlng, options) {
  return new L.LocationMarker(latlng, options);
};
