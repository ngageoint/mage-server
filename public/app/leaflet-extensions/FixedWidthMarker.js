L.FixedWidthMarker = L.Marker.extend({

  initialize: function(latlng, options) {
    var self = this;
    if (options.iconUrl) {
      options.icon = L.fixedWidthIcon({
        iconUrl: options.iconUrl,
        onIconLoad: function() {
          if (self._popup && self._icon) {
            self._popup.options.offset = [0, self._icon.offsetTop + 10];
            self._popup.update();
          }
        }
      });
    }

    L.Marker.prototype.initialize.call(this, latlng, options);
  },

  openPopup: function (layer, latlng) {
    this._openPopup = true;

    if (this._popup && this._popup.options.iconUrl) {
      this._popup.options.offset = [0, this._icon.offsetTop + 10];
    }

    if (this._popup && this._map && !this._map.hasLayer(this._popup)) {

      this._map.openPopup(this._popup, latlng);
    }

    return this;
  }

});

L.fixedWidthMarker = function (latlng, options) {
  return new L.FixedWidthMarker(latlng, options);
};
