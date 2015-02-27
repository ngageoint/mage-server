L.FixedWidthMarker = L.Marker.extend({

  initialize: function(latlng, options) {
    if (options.iconUrl) {
      options.icon = L.fixedWidthIcon({
        iconUrl: options.iconUrl
      });
    }

    L.Marker.prototype.initialize.call(this, latlng, options);
  },

  openPopup: function () {
    if (this._popup && this._map && !this._map.hasLayer(this._popup)) {
      this._popup.options.offset = [0, this._icon.offsetTop + 7];

      this._popup.setLatLng(this._latlng);
      this._map.openPopup(this._popup);
    }

    return this;
  }
});

L.fixedWidthMarker = function (latlng, options) {
  return new L.FixedWidthMarker(latlng, options);
};
