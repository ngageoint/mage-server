var L = require('leaflet');

L.LocationMarker.include({
  openPopup: function () {
    this._getMarker().openPopup()
    return this;
  },

  closePopup: function () {
    this._getMarker().closePopup();
    return this;
  },

  togglePopup: function () {
    this._getMarker().togglePopup();
    return this;
  },

  getPopup:function() {
    return this._getMarker()._popup;
  },

  bindPopup: function (popup) {
    this._getMarker().bindPopup(popup);
    return this;
  },

  unbindPopup: function () {
    this._getMarker().unbindPopup();
    return this;
  },

  _getMarker: function() {
    return this._iconMarker ?
      this._iconMarker :
      this._locationMarker;
  }
});
