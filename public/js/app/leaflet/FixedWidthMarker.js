L.FixedWidthMarker = L.Marker.extend({

  initialize: function(latlng, options) {
    if (options.iconUrl) {
      options.icon = L.fixedWidthIcon({
        iconUrl: options.iconUrl,
        onIconLoad: this._onIconLoad,
        marker: this
      });

      L.DomEvent.on(this, 'fixedwidthiconload', this._onIconLoad, this);
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
  },

  _onIconLoad: function() {
    if (this._popup) {
      this._popup.options.offset = [0, this._icon.offsetTop + 7];
      this._popup.update();
    }
  }

});

L.fixedWidthMarker = function (latlng, options) {
  return new L.FixedWidthMarker(latlng, options);
};
