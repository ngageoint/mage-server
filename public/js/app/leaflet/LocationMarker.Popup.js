L.LocationMarker.include({
  openPopup: function () {
    this._locationMarker.openPopup();
    return this;
  },

  closePopup: function () {
    this._locationMarker.closePopup();
    return this;
  },

  togglePopup: function () {
    this._locationMarker.togglePopup();
    return this;
  },

	bindPopup: function (content, options) {
  	this._locationMarker.bindPopup(content, options);
		return this;
	},

	setPopupContent: function (content) {
  	this._locationMarker.setPopupContent(content);
		return this;
	},

	unbindPopup: function () {
  	this._locationMarker.unbindPopup();
		return this;
	},

	_movePopup: function (e) {
  	this._locationMarker.setLatLng(e.latlng);
	}
});