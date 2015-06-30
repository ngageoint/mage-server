L.LocationMarker.include({
  openPopup: function () {
    if (this._iconMarker) {
      this._iconMarker.openPopup();
    } else {
        this._locationMarker.openPopup();
    }

    return this;
  },

  closePopup: function () {
    if (this._iconMarker) {
      this._iconMarker.closePopup();
    } else {
      this._locationMarker.closePopup();
    }

    return this;
  },

  togglePopup: function () {
    if (this._iconMarker) {
      this._iconMarker.togglePopup();
    } else {
      this._locationMarker.togglePopup();
    }

    return this;
  },

  getPopup:function() {
    if (this._iconMarker) {
      return this._iconMarker._popup;
    } else {
      return this._locationMarker._popup;
    }
  },

	bindPopup: function (content, options) {
    var options = options || {};
    if (this._iconMarker) {
      options.offset = [0, -33];
      this._popup = L.popup(options).setContent(content);
      this._iconMarker.bindPopup(this._popup);

      this._iconMarker.on({
        popupclose: function(e) {
          this.fire(e.type, e.popup);
        },
        popupopen: function(e) {
          this.fire(e.type, e.popup);
        }
      }, this);

    } else {
      this._locationMarker.bindPopup(content, options);

      this._locationMarker.on({
        popupclose: function(e) {
          this.fire(e.type, e.popup);
        },
        popupopen: function(e) {
          this.fire(e.type, e.popup);
        }
      }, this);
    }

		return this;
	},

	unbindPopup: function () {
  	this._locationMarker.unbindPopup();
    this._iconMarker.unbindPopup();

		return this;
	}
});
