L.MarkerClusterGroup.include({

  /* LEAFLET : getParentAtZoom(marker, zoom)
   * Gets the cluster visible at a particular zoom of a marker or itself if it is visible at a zoom level.
   */
   getParentAtZoom: function(marker, zoom) {
    var p = marker;
    if (marker.__parent._zoom < zoom) return marker;
    while (p.__parent && (p._zoom > zoom || !p._zoom)) {
      p = p.__parent
    };
    return p;
  },

  //Zoom down to show the given layer (spiderfying if necessary) then calls the callback
  panToShowLayer: function (layer, callback) {

    var showMarker = function () {
      this._map.off('moveend', showMarker, this);
      this.off('animationend', showMarker, this);

      var cluster = this.getParentAtZoom(layer, this._map.getZoom());
      if (cluster == layer) {
        callback();
      } else {
        var afterSpiderfy = function () {
          this.off('spiderfied', afterSpiderfy, this);
          callback({layer: layer.__parent});
        };

        this.on('spiderfied', afterSpiderfy, this);
        layer.__parent.spiderfy();
      }
    };

    if (layer._icon && this._map.getBounds().contains(layer.getLatLng())) {
      //Layer is visible ond on screen, pan to it
      this._map.on('moveend', showMarker, this);
      this._map.panTo(layer.getLatLng());
    } else if (layer.__parent._zoom < this._map.getZoom()) {
      //Layer should be visible at this zoom level. It must not be on screen so just pan over to it
      this._map.on('moveend', showMarker, this);
      this._map.panTo(layer.getLatLng());
    } else {
      // TODO need to mod this part to not zoom
      // just pan so cluster is centered on screen
      var moveStart = function () {
        this._map.off('movestart', moveStart, this);
        moveStart = null;
      };

      this._map.on('movestart', moveStart, this);
      this._map.on('moveend', showMarker, this);
      this.on('animationend', showMarker, this);
      this._map.setView(layer.getLatLng());

      if (moveStart) {
        //Never started moving, must already be there, probably need clustering however
        showMarker.call(this);
      }
    }
  }

});
