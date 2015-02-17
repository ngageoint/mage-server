(function () {

  var _onAdd = L.Marker.prototype.onAdd;
  var _setOpacity = L.Marker.prototype.setOpacity;
  var _selectedMarker = null;

  L.Marker.include({

    _selectMarker: L.circleMarker([0,0], {
      radius: 20,
      weight: 5,
      color: '#7C22C7',
      fillColor: '#7C22C7',
      opacity: 1,
      fillOpacity: .4,
      fill: true,
      clickable: false
    }),

    onAdd: function (map) {
      this._map = map;
      _onAdd.call(this, map);

      map.on('layeradd', this._onLayerAdd, this);
      map.on('layerremove', this._onLayerRemove, this);
    },

    select: function () {
      this._selectMarker.setLatLng(this.getLatLng());

      if (!this.isSelected()) {
        if (this._map) {
          this._map.addLayer(this._selectMarker);
        }
        _selectedMarker = this;
      }

      return this;
    },

    unselect: function() {
      if (this._map && this.isSelected()) {
        this._map.removeLayer(this._selectMarker);
      }
      _selectedMarker = null;

      return this;
    },

    isSelected: function() {
      return _selectedMarker === this;
    },

    setLatLng: function (latlng) {
      var oldLatLng = this._latlng;
      this._latlng = L.latLng(latlng);

      if (this.isSelected()) {
        this._selectMarker.setLatLng(latlng);
      }

      this.update();
      return this.fire('move', {oldLatLng: oldLatLng, latlng: this._latlng});
    },

    setOpacity: function(opacity) {
      if (!this.isSelected()) return;

      _setOpacity.call(this, opacity);
      this._selectMarker.setStyle({ opacity: opacity });
    },

    _onLayerAdd: function(o) {
      if (o.layer == this && this.isSelected()) {
        // The marker/layer being added is the selected marker.
        // Add the select marker as well
        o.target.addLayer(this._selectMarker);
      }
    },

    _onLayerRemove: function(o) {
      if (o.layer == this && this.isSelected()) {
        // The marker/layer being removed is the selected marker.
        // Remove the select marker as well
        o.target.removeLayer(this._selectMarker);
      }
    }

  });
})();
