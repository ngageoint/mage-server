var L = require('leaflet');

L.FixedWidthMarker = L.Marker.extend({
  options: {
    iconWidth: 35
  },

  initialize: function(latlng, options) {
    L.Marker.prototype.initialize.call(this, latlng, options);

    const self = this;
    if (options.iconUrl) {
      options.icon = this.fixedWidthIcon = L.fixedWidthIcon({
        iconUrl: options.iconUrl,
        tooltip: options.tooltip,
        iconWidth: this.options.iconWidth,
        onIconLoad: function() {
          if (self._popup && self._icon) {
            const iconHeight = $(self._icon).height();

            const popup = self.getPopup();
            popup.options.offset = [0, (iconHeight - 8) * -1];
            popup.update();
          }
        }
      });
    }

    L.Marker.prototype.initialize.call(this, latlng, options);
  },

  bindPopup: function (popup, options = {}) {
    if (this._icon) {
      options.offset = [0, ($(this._icon).height() - 8) * -1];
    }

    L.Marker.prototype.bindPopup.call(this, popup, options);

    return this;
  }
});

L.fixedWidthMarker = function (latlng, options) {
  return new L.FixedWidthMarker(latlng, options);
};
