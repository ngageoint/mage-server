import { DomUtil, geoJSON, GeoJSON, LatLng, LatLngBounds, latLngBounds, Map, marker } from "leaflet";
import { fixedWidthIcon } from "../marker/FixedWidthIcon";

export class FeatureEditor {
  private readonly map: Map
  private readonly layer: any
  private readonly vertexClickListener: any
  private readonly vertexDeletedListener: any
  private readonly geometryChangedListener: any
  
  constructor(map: Map, feature: any, delegate: any) {
    this.map = map;
    this.geometryChangedListener = delegate.geometryChanged || function () { };
    this.vertexClickListener = delegate.vertexClick || function () { };
    this.vertexDeletedListener = delegate.vertexDeleted || function () { };

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
      const polygon = feature.geometry.type === 'Polygon';
      const latLngs = this.shapeLatLngs(feature);
      if (latLngs.length >= (polygon ? 3 : 2)) {
        this.layer = geoJSON(feature, {
          style: () => {
            return feature.style;
          }
        }).getLayers()[0];
        this.layer.addTo(this.map);

        this.map.fitBounds(this.layer.getBounds());
        this.initiateShapeEdit();
      } else {
        this.layer = polygon ? this.map.editTools.startPolygon() : this.map.editTools.startPolyline();
        latLngs.forEach(latLng => this.layer.editor.push(latLng));
        if (latLngs.length) {
          this.layer.editor.connect();
          this.map.panTo(latLngs[latLngs.length - 1]);
        }
        this._addEditEvents(this.layer);
        this.geometryChangedListener(this.layer.toGeoJSON().geometry);
      }
    }
  }

  getBounds(): LatLngBounds | undefined {
    const bounds = this.layer.getLatLng ? latLngBounds([this.layer.getLatLng()]) : this.layer.getBounds();
    return bounds.isValid() ? latLngBounds(bounds.getSouthWest(), bounds.getNorthEast()) : undefined;
  }

  shapeLatLngs(feature: any): LatLng[] {
    if (feature.geometry.type === 'Polygon') {
      const ring = feature.geometry.coordinates[0] || [];
      return GeoJSON.coordsToLatLngs(ring.slice(0, -1));
    }

    return GeoJSON.coordsToLatLngs(feature.geometry.coordinates);
  }

  stopEdit() {
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

  initiateShapeEdit() {
    this.layer.enableEdit();
    this._addEditEvents(this.layer);

    this.geometryChangedListener(this.layer.toGeoJSON().geometry);
  }

  _addEditEvents(layer) {
    const geometryChanged = e => {
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
      const marker = e.vertex;
      if (layer.editor.vertexCanBeDeleted(marker)) {
        // Report before deleting, delete triggers geometryChanged with the new vertex count
        this.vertexDeletedListener({ index: marker.getIndex() });
        marker.delete();
      }
    });
  }

  selectVertex(index: number) {
    const editLayer = this.layer.editor?.editLayer;
    if (!editLayer) return;

    const vertex = editLayer.getLayers().find(layer => typeof layer.getIndex === 'function' && layer.getIndex() === index);
    if (vertex) {
      this._selectVertex(this.layer, vertex, false);
    }
  }

  _selectVertex(layer, vertex, notify = true) {
    layer.editor.editLayer.eachLayer(function (layer) {
      DomUtil.removeClass(layer.getElement(), 'selected-marker');
    });
    DomUtil.addClass(vertex.getElement(), 'selected-marker');
    layer.selectedVertex = vertex;
    if (!notify) return;

    this.vertexClickListener({
      index: vertex.getIndex(),
      geometry: vertex.toGeoJSON().geometry
    });
  }
}