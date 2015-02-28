L.FixedWidthMarker = L.Marker.extend({

  initialize: function(latlng, options) {
    var self = this;
    if (options.iconUrl) {
      options.icon = L.fixedWidthIcon({
        iconUrl: options.iconUrl,
        onIconLoad: function() {
          if (self._popup) {
            self._popup.options.offset = [0, self._icon.offsetTop + 7];
            self._popup.update();
          }
        }
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
