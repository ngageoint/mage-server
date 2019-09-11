var L = require('leaflet');

require('leaflet-control-geocoder');

L.Control.ClearableGeocoder = L.Control.Geocoder.extend({
  options: {
    defaultMarkGeocode: false
  },

  onAdd: function(map) {
    var container = L.Control.Geocoder.prototype.onAdd.call(this, map);

    this._clearButton = L.DomUtil.create(
      'a',
      'fa fa-times leaflet-control-geocoder-clear',
      this._form
    );

    L.DomEvent.addListener(this._clearButton, 'touchstart mousedown', this.clearSearch, this);

    // var resetButton = createElement('a', 'fa fa-times', form);
    // resetButton.innerHTML = 'X';
    // button.href = '#';
    // resetButton.addEventListener('click', () => { this.clearResults(null, true); }, false);

    this.on('markgeocode', this.onGeocode, this);

    return container;
  },

  onGeocode: function(result) {
    result = result.geocode || result;

    this._map.fitBounds(result.bbox);

    this.clearSearch();

    this._marker = new L.Marker(result.center)
      .bindPopup(result.html || result.name)
      .addTo(this._map)
      .openPopup();

    return this;
  },

  clearSearch: function() {
    if (this._marker) {
      this._map.removeLayer(this._marker);
    }
  }

});

L.Control.clearableGeocoder = function(options) {
  return new L.Control.ClearableGeocoder(options);
};
