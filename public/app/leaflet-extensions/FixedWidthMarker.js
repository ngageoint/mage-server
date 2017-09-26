L.FixedWidthMarker = L.Marker.extend({

  initialize: function(latlng, options) {
    var self = this;
    if (options.iconUrl) {
      options.icon = L.fixedWidthIcon({
        iconUrl: options.iconUrl,
        tooltip: options.tooltip,
        onIconLoad: function() {
          if (self._popup && self._icon) {
            var iconHeight = $(self._icon).height();

            var popup = self.getPopup();
            popup.options.offset = [0, (iconHeight - 8) * -1];
            popup.update();
          }
        }
      });
    }

    L.Marker.prototype.initialize.call(this, latlng, options);
  }
});

L.fixedWidthMarker = function (latlng, options) {
  return new L.FixedWidthMarker(latlng, options);
};
