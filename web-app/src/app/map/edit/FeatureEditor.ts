import { DomUtil, geoJSON, GeoJSON, Map, marker, point, tooltip, Tooltip } from "leaflet";
import { fixedWidthIcon } from "../marker/FixedWidthIcon";

export class FeatureEditor {
  private map: Map
  private layer: any
  private editedFeature: any
  private tooltip: Tooltip
  private vertexClickListener: any
  private geometryChangedListener: any
  
  constructor(map: Map, feature: any, delegate: any) {
    this.map = map;
    this.geometryChangedListener = delegate.geometryChanged || function () { };
    this.vertexClickListener = delegate.vertexClick || function () { };

    this.tooltip = tooltip({
      className: 'overlay-tooltip',
      offset: point(20, 0),
      direction: 'right',
      permanent: true
    });

    map.on('editable:drawing:start', this.addTooltip, this);
    map.on('editable:drawing:end', this.removeTooltip, this);
    map.on('editable:drawing:clicked', this.updateTooltip, this);

    if (feature.geometry.type === 'Point') {
      if (feature.geometry.coordinates.length) {
        this.map.setView(GeoJSON.coordsToLatLng(feature.geometry.coordinates), 17);
      } else {
        let center = this.map.getCenter();
        feature.geometry.coordinates = [center.lng, center.lat];
      }

      this.layer = geoJSON(feature, {
        pointToLayer: (_, latLng) => {
          return marker(latLng, {
            icon: fixedWidthIcon({
              iconUrl: feature?.style?.iconUrl,
              html: '<b>Edit Observation</b><div>Drag this marker to re-position</div>'
            })
          });
        }
      }).getLayers()[0];

      this.layer.addTo(this.map)

      this.initiatePointEdit();
    } else {     
      if (feature.geometry.coordinates.length) {
        this.layer = geoJSON(feature, {
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

  initiateShapeEdit(selectVertexIndex?: any) {
    this.layer.enableEdit();
    this.layer.selectedVertex = this.layer.editor.editLayer.getLayers()[selectVertexIndex || 0];
    DomUtil.addClass(this.layer.selectedVertex.getElement(), 'selected-marker');

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
      DomUtil.removeClass(layer.getElement(), 'selected-marker');
    });
    DomUtil.addClass(vertex.getElement(), 'selected-marker');
    layer.selectedVertex = vertex;
    this.vertexClickListener({
      index: vertex.getIndex(),
      geometry: vertex.toGeoJSON().geometry
    });
  }

  addTooltip (e) {
    this.map.on('mousemove', this.moveTooltip, this);

    if (this.isPolygonEditor(e.layer.editor)) {
      this.tooltip.setContent('<b>Edit Observation</b><div>Click on the map to start a polygon</div>');
    } else {
      this.tooltip.setContent('<b>Edit Observation</b><div>Click on the map to start a line</div>');
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
      if (this.isPolygonEditor(e.layer.editor)) {
        this.tooltip.setContent('<b>Edit Observation</b><div>Click on the map to continue polygon</div>');
      } else {
        this.tooltip.setContent('<b>Edit Observation</b><div>Click on the map to continue line</div>');
      }
    } else {
      if (this.isPolygonEditor(e.layer.editor)) {
        this.tooltip.setContent('<b>Edit Observation</b><div>Click on last point to finish polygon</div>');
      } else {
        this.tooltip.setContent('<b>Edit Observation</b><div>Click on last point to finish line</div>');
      }
    }
  }

  isPolygonEditor(editor: any): boolean {
    return typeof editor.newHole === 'function'
  }
}