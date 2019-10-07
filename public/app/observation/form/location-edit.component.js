import angular from 'angular';
import L from 'leaflet';
import mgrs from 'mgrs';
import {textField}  from 'material-components-web';
import MageFeatureEdit from '../../leaflet-extensions/FeatureEdit';
import template from './location-edit.component.html';

class LocationEditController {

  constructor($element, $timeout, MapService, GeometryService, LocalStorageService) {
    this._$element = $element;
    this._$timeout = $timeout;
    this._MapService = MapService;
    this._GeometryService = GeometryService;
    this._LocalStorageService = LocalStorageService;

    this._layers = {};
    this._valid = {
      mgrs: true
    };

    this.coordinateSystem = LocalStorageService.getCoordinateSystemEdit();
  }

  $postLink() {
    this._map = L.map(this._$element.find('.map-container')[0], {
      center: [0,0],
      zoom: 3,
      minZoom: 0,
      maxZoom: 18,
      zoomControl: true,
      trackResize: true,
      scrollWheelZoom: true,
      attributionControl: false,
      editable: true
    });

    this.mapListener = {
      onBaseLayerSelected: this.onBaseLayerSelected.bind(this)
    };
    this._MapService.addListener(this.mapListener);
    this.currentGeometry = {
      geometry: this.shape
    };

    this.featureEdit = new MageFeatureEdit(this._map, this._MapService, this._GeometryService, this.geometryChangedListener.bind(this), this.vertexClickListener.bind(this));
    this.editingFeature = this.addObservation({type: 'Feature', geometry: this.shape, style: this.geometryStyle});
    this.featureEdit.startEdit(this.editingFeature, this.selectedVertexIndex);
  }

  $onChanges() {
    this.shape = angular.copy(this.field.value);
    this.value = angular.copy(this.field.value);
    this.selectedVertexIndex = 0;
    this.mgrs = this.toMgrs(this.field);
    this.updateSelectedVertex();
    this.initializeTextFields();
  }

  saveLocation() {
    this.saveEdit({value: this.currentGeometry.geometry});
  }

  clearLocation() {
    this.saveEdit({value: undefined});
  }

  cancel() {
    this._MapService.removeListener(this.mapListener);
    this.cancelEdit();
  }

  onBaseLayerSelected(baseLayer) {
    var layer = this._layers[baseLayer.name];
    if (layer) this._map.removeLayer(layer.layer);

    layer = this.createRasterLayer(baseLayer);
    this._layers[baseLayer.name] = {type: 'tile', layer: baseLayer, rasterLayer: layer};

    layer.addTo(this._map);
  }

  createRasterLayer(layer) {
    var baseLayer = null;
    var options = {};
    if (layer.format === 'XYZ' || layer.format === 'TMS') {
      options = { tms: layer.format === 'TMS', maxZoom: 18 };
      baseLayer = new L.TileLayer(layer.url, options);
    } else if (layer.format === 'WMS') {
      options = {
        layers: layer.wms.layers,
        version: layer.wms.version,
        format: layer.wms.format,
        transparent: layer.wms.transparent
      };

      if (layer.wms.styles) options.styles = layer.wms.styles;
      baseLayer = new L.TileLayer.WMS(layer.url, options);
    }

    return baseLayer;
  }

  coordinateSystemChange(coordinateSystem) {
    this._LocalStorageService.setCoordinateSystemEdit(coordinateSystem);
    this.coordinateSystem = coordinateSystem;
    if (coordinateSystem === 'mgrs') {
      this.mgrs = this.toMgrs(this.field);
    }

    this._$timeout(() => {
      this.initializeTextFields();
      this.setFieldValues();
    });
  }

  toMgrs(field) {
    switch (this.shape.type) {
    case 'Point':
      return mgrs.forward(field.value.coordinates);
    case 'LineString':
      return mgrs.forward(field.value.coordinates[this.selectedVertexIndex]);
    case 'Polygon':
      return mgrs.forward(field.value.coordinates[0][this.selectedVertexIndex]);
    }
  }

  onLatLngChange() {
    var coordinates = angular.copy(this.shape.coordinates);

    // copy edit field lat/lng in coordinates at correct index
    if (this.shape.type === 'LineString') {
      coordinates[this.selectedVertexIndex] = angular.copy([Number(this.longitudeField.value), Number(this.latitudeField.value)]);
    } else if (this.shape.type === 'Polygon') {
      if (coordinates[0]) {
        coordinates[0][this.selectedVertexIndex] = angular.copy([Number(this.longitudeField.value), Number(this.latitudeField.value)]);
      }
    }

    // transform corrdinates to valid GeoJSON
    this.toGeoJSON(this.field, coordinates);

    // Check for polygon for intersections
    if (this.hasIntersections(this.field, coordinates)) {
      return;
    }

    this.shape.coordinates = coordinates;
    this.featureEdit.stopEdit();
    this.editingFeature = this.addObservation({type: 'Feature', geometry: this.shape, style: this.geometryStyle});

    this.featureEdit.startEdit(this.editingFeature, this.selectedVertexIndex);
  }

  onMgrsChange() {
    try {
      this.toLatLng();
      this.valid.mgrs = true;
      this.mgrsField.valid = true;
    } catch(e) {
      this.mgrsField.valid = false;
      this.valid.mgrs = false;
    }
  }

  toLatLng() {
    var coordinates = angular.copy(this.field.value.coordinates);

    switch (this.field.value.type) {
    case 'Point':
      coordinates = mgrs.toPoint(this.mgrs);
      break;
    case 'LineString':
      coordinates[this.selectedVertexIndex] = mgrs.toPoint(this.mgrs);
      break;
    case 'Polygon':
      coordinates[0][this.selectedVertexIndex] = mgrs.toPoint(this.mgrs);
      break;
    }

    // transform corrdinates to valid GeoJSON
    this.toGeoJSON(this.field, coordinates);

    // Check for polygon for intersections
    if (this.hasIntersections(this.field, coordinates)) {
      return;
    }

    this.shape.coordinates = coordinates;
    this.featureEdit.stopEdit();
    this.editingFeature = this.addObservation({type: 'Feature', geometry: this.shape, style: this.geometryStyle});

    this.featureEdit.startEdit(this.editingFeature, this.selectedVertexIndex);
  }

  hasIntersections(field, coordinates) {
    if (field.value.type !== 'Point') {
      if (this._GeometryService.featureHasIntersections({geometry: {coordinates: coordinates}})) {
        if (field.value.type === 'LineString') { // Is it ok for line string to intersect
          field.edit = angular.copy(field.value.coordinates[this.selectedVertexIndex]);
        } else if (field.value.type === 'Polygon') {
          if (field.value.coordinates[0]) {
            field.edit = angular.copy(field.value.coordinates[0][this.selectedVertexIndex]);
          }
        }

        return true;
      }
    }

    return false;
  }

  toGeoJSON(field, coordinates) {
    // Ensure first and last points are the same for polygon
    if (field.value.type === 'Polygon') {
      if (field.editedVertex === 0) {
        coordinates[0][coordinates[0].length - 1] = coordinates[0][0];
      } else if (field.editedVertex === coordinates[0].length - 1) {
        coordinates[0][0] = coordinates[0][coordinates[0].length - 1];
      }
    }
  }

  vertexClickListener(vertex) {
    this._$timeout(() => {
      this.selectedVertexIndex = vertex.getIndex();
      this.selectedVertex = [vertex.latlng.lng, vertex.latlng.lat];
      this.mgrs = mgrs.forward(this.selectedVertex);
      this.valid.mgrs = true;
      this.setFieldValues();
    });
  }

  setFieldValues() {
    if (this.latitudeField) {
      this.longitudeField.value = this.selectedVertex[0];
      this.latitudeField.value = this.selectedVertex[1];
    }
    if (this.mgrsField) {
      this.mgrsField.value = this.mgrs;
      this.valid.mgrs = true;
    }
  }

  geometryChangedListener(geometry) {
    this._$timeout(() => {
      this.currentGeometry.geometry = geometry;
      this.shape = geometry;
      this.updateSelectedVertex();
    });
  }

  addObservation(feature) {
    if(feature.geometry){
      if(feature.geometry.type === 'Point'){
        var observation = L.geoJson(feature, {
          pointToLayer: (feature, latlng) => {
            return L.fixedWidthMarker(latlng, {
              iconUrl: this.geometryStyle ? this.geometryStyle.iconUrl : ''
            });
          }
        });
        observation.addTo(this._map);
        this._map.setView(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates), 15);
        return observation.getLayers()[0];
      } else {
        observation = L.geoJson(feature, {
          style: () => {
            return this.geometryStyle;
          }
        });
        observation.addTo(this._map);

        var coordinates = feature.geometry.coordinates;
        if(feature.geometry.type === 'Polygon'){
          coordinates = coordinates[0];
        }
        this._map.fitBounds(L.latLngBounds(L.GeoJSON.coordsToLatLngs(coordinates)));
        return observation.getLayers()[0];
      }
    }
  }

  validateShapeChange() {
    if (!this.shape || !this.shape.type || this.shape.type === this.value.type) return;

    switch(this.shape.type) {
    case 'Point':
      this.value.coordinates = [];
      this.value.type = 'Point';
      break;
    case 'LineString':
      this.value.coordinates = [];
      this.value.type = 'LineString';
      break;
    case 'Polygon':
      this.value.coordinates = [[]];
      this.value.type = 'Polygon';
      break;
    }

    this.value.type = this.shape.type;
  }

  shapeTypeChanged(shapeType) {
    this.shape.type = shapeType;
    this.validateShapeChange();
    this.onEditShape();
  }

  onEditShape() {
    if(!this.editingFeature) return;
    this.featureEdit.stopEdit();

    if (this.shape.type === 'Point') {
      var center = this._map.getCenter();
      this.value.coordinates = [center.lng, center.lat];
      this.editingFeature = this.addObservation({type: 'Feature', geometry: this.value, style: this.geometryStyle});
      this.featureEdit.startEdit(this.editingFeature, this.selectedVertexIndex);
    } else {
      this.featureEdit.initiateShapeDraw({type: 'Feature', geometry: this.value, style: this.geometryStyle});
    }
  }

  updateSelectedVertex() {
    if (this.shape.type === 'Point') {
      this.selectedVertex = [this.shape.coordinates[0], this.shape.coordinates[1]];
    } else if (this.shape.type === 'Polygon') {
      this.selectedVertex = [this.shape.coordinates[0][this.selectedVertexIndex][0], this.shape.coordinates[0][this.selectedVertexIndex][1]];
    } else if (this.shape.type === 'LineString') {
      this.selectedVertex = [this.shape.coordinates[this.selectedVertexIndex][0], this.shape.coordinates[this.selectedVertexIndex][1]];
    }
  }

  initializeTextFields() {
    if (!this.latitudeField && this.coordinateSystem === 'wgs84') {
      this._$timeout(() => {
        this.latitudeField = new textField.MDCTextField(this._$element.find('.latitude-text-field')[0]);
        this.longitudeField = new textField.MDCTextField(this._$element.find('.longitude-text-field')[0]);
        this.longitudeField.value = this.selectedVertex[0];
        this.latitudeField.value = this.selectedVertex[1];
      });
    } else if (!this.mgrsField && this.coordinateSystem === 'mgrs') {
      this._$timeout(() => {
        this.mgrsField = new textField.MDCTextField(this._$element.find('.mgrs-text-field')[0]);
        this.mgrsField.useNativeValidation = false;

        this.mgrsField.value = this.mgrs;
        this.mgrsField.valid = true;
      });
    }
  }
}

LocationEditController.$inject = ['$element', '$timeout', 'MapService', 'GeometryService', 'LocalStorageService'];

const LocationEdit = {
  template: template,
  bindings: {
    field: '<',
    geometryStyle: '<',
    clearable: '<',
    onFieldChanged: '&',
    cancelEdit: '&',
    saveEdit: '&'
  },
  controller: LocationEditController
};

export default LocationEdit;
