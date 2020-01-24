var L = require('leaflet');

class MageFeatureEdit {
  constructor(map, feature, delegate) {
    this.map = map;
    this.geometryChangedListener = delegate.geometryChanged || function () { };
    this.vertexClickListener = delegate.vertexClick || function () { };

    this.tooltip = new L.tooltip({
      className: 'overlay-tooltip',
      offset: L.point(20, 0),
      direction: 'right',
      permanent: true
    });

    map.on('editable:drawing:start', this.addTooltip, this);
    map.on('editable:drawing:end', this.removeTooltip, this);
    map.on('editable:drawing:clicked', this.updateTooltip, this);

    if (feature.geometry.type === 'Point') {
      if (feature.geometry.coordinates.length) {
        this.map.setView(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates), 17);
      } else {
        let center = this.map.getCenter();
        feature.geometry.coordinates = [center.lng, center.lat];
      }

      this.layer = L.geoJson(feature, {
        pointToLayer: (_, latlng) => {
          return L.fixedWidthMarker(latlng, {
            icon: L.fixedWidthIcon({
              iconUrl: feature.style ? feature.style.iconUrl : '',
              tooltip: true
            }),
            tooltip: true
          });
        }
      }).getLayers()[0];
      this.layer.addTo(this.map);
      this.initiatePointEdit();
    } else {     
      if (feature.geometry.coordinates.length) {
        this.layer = L.geoJson(feature, {
          style: () => {
            return feature.style;
          }
        }).getLayers()[0];
        this.layer.addTo(this.map);

        this.map.fitBounds(this.layer.getBounds());
        this.initiateShapeEdit();
      } else {
        this.layer = feature.geometry.type === 'Polygon' ? this.map.editTools.startPolygon() : this.map.editTools.startPolyline();
        this.initiateShapeDraw();
      }
    }
  }

  stopEdit() {
    this.map.off('editable:drawing:start', this.addTooltip, this);
    this.map.off('editable:drawing:end', this.removeTooltip, this);
    this.map.off('editable:drawing:clicked', this.updateTooltip, this);
    this.removeTooltip();

    this.layer.disableEdit();
    this.map.removeLayer(this.layer);
    return this.layer.toGeoJSON();
  }

  initiatePointEdit() {
    this.layer.dragging.enable();
    this.layer.on('dragend', event => {
      this.geometryChangedListener(event.target.toGeoJSON().geometry);
    });

    this.geometryChangedListener(this.layer.toGeoJSON().geometry);
  }

  initiateShapeDraw() {
    this.layer.on('editable:drawing:commit', e => {
      this.layer.off('editable:vertex:rawclick');
      this.layer.off('editable:vertex:contextmenu');
      this.layer.off('editable:drawing:commit');

      // TODO select last vertex, or first vertex

      this._addEditEvents(this.layer);
      this.geometryChangedListener(e.layer.toGeoJSON().geometry);
    });

    this.layer.on('editable:vertex:rawclick', e => {
      e.cancel();  // don't delete vertex on click
    });

    this.layer.on('editable:vertex:contextmenu', e => {
      var marker = e.vertex;
      if (this.editedFeature.editor.vertexCanBeDeleted(marker)) {
        marker.delete();
      }
    });
  }

  initiateShapeEdit(selectVertexIndex) {
    this.layer.enableEdit();
    this.layer.selectedVertex = this.layer.editor.editLayer.getLayers()[selectVertexIndex || 0];
    L.DomUtil.addClass(this.layer.selectedVertex.getElement(), 'selected-marker');

    this._addEditEvents(this.layer);
  }

  _addEditEvents(layer) {
    var geometryChanged = e => {
      this.geometryChangedListener(e.layer.toGeoJSON().geometry);
    };

    layer.on('editable:vertex:new', geometryChanged);
    layer.on('editable:vertex:deleted', geometryChanged);

    layer.on('editable:vertex:dragend', e => {
      this._selectVertex(layer, e.vertex);
      this.geometryChangedListener(layer.toGeoJSON().geometry);
    });

    layer.on('editable:vertex:rawclick', e => {
      e.cancel();  // don't delete vertex on click
      this._selectVertex(layer, e.vertex);
    });

    layer.on('editable:vertex:contextmenu', e => {
      var marker = e.vertex;
      if (layer.editor.vertexCanBeDeleted(marker)) {
        // TODO select first vertex
        marker.delete();
      }
    });
  }

  _selectVertex(layer, vertex) {
    layer.editor.editLayer.eachLayer(function (layer) {
      L.DomUtil.removeClass(layer.getElement(), 'selected-marker');
    });
    L.DomUtil.addClass(vertex.getElement(), 'selected-marker');
    layer.selectedVertex = vertex;
    this.vertexClickListener({
      index: vertex.getIndex(),
      geometry: vertex.toGeoJSON().geometry
    });
  }

  addTooltip (e) {
    this.map.on('mousemove', this.moveTooltip, this);

    if (e.layer.editor instanceof L.Editable.PolylineEditor) {
      this.tooltip.setContent('<b>Edit Observation</b><div>Click on the map to start a line</div>');
    } else {
      this.tooltip.setContent('<b>Edit Observation</b><div>Click on the map to start a polygon</div>');
    }

    const center = this.map.getCenter();
    let point = this.map.latLngToLayerPoint(center);
    point.y -= 25;
    point.x -= 3;
    let latLng = this.map.layerPointToLatLng(point);
    this.tooltip.setLatLng(latLng);
    this.tooltip.addTo(this.map);
  }

  removeTooltip () {
    this.tooltip.remove();
    this.map.off('mousemove', this.moveTooltip, this);
  }

  moveTooltip (e) {
    this.tooltip.setLatLng(e.latlng);
  }

  updateTooltip (e) {
    if (e.layer.editor._drawnLatLngs.length < e.layer.editor.MIN_VERTEX) {
      if (e.layer.editor instanceof L.Editable.PolylineEditor) {
        this.tooltip.setContent('<b>Edit Observation</b><p>Click on the map to continue line</p>');
      } else {
        this.tooltip.setContent('<b>Edit Observation</b><p>Click on the map to continue polygon</p>');
      }
    } else {
      if (e.layer.editor instanceof L.Editable.PolylineEditor) {
        this.tooltip.setContent('<b>Edit Observation</b><p>Click on last point to finish line</p>');
      } else {
        this.tooltip.setContent('<b>Edit Observation</b><p>Click on last point to finish polygon</p>');
      }
    }
  }
}

module.exports = MageFeatureEdit;