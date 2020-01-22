import angular from 'angular';
import mgrs from 'mgrs';
import {textField, snackbar}  from 'material-components-web';
import template from './geometry.edit.form.html';

class GeometryEditFormController {

  constructor($element, $timeout, MapService, GeometryService, LocalStorageService) {
    this._$element = $element;
    this._$timeout = $timeout;
    this._MapService = MapService;
    this.GeometryService = GeometryService;
    this._LocalStorageService = LocalStorageService;

    this._layers = {};
    this.coordinateSystem = LocalStorageService.getCoordinateSystemEdit();
  }

  $onInit() {
    this.invalidGeometrySnackbar = new snackbar.MDCSnackbar(this._$element.find('#invalid-geometry-snackbar')[0]);
    this.invalidGeometrySnackbar.timeoutMs = 4000;
  }

  $onChanges() {
    if (this.feature) {
      this.feature = angular.copy(this.feature);

      this.featureEdit = this._MapService.createFeature(this.feature, {
        geometryChanged: geometry => {
          this.geometryChanged(geometry);
        }, vertexClick: vertex => {
          this.vertexClick(vertex);
        }
      });

      this.selectedVertexIndex = 0;
      this.mgrs = this.toMgrs(this.feature);
      this.updateSelectedVertex();
      this.initializeTextFields();
    }
  }

  geometryChanged(geometry) {
    this._$timeout(() => {
      this.feature.geometry = geometry;
      this.updateSelectedVertex();
      this.mgrs = this.toMgrs(this.feature);
      this.setFieldValues();
    });
  }

  vertexClick(vertex) {
    this._$timeout(() => {
      this.selectedVertexIndex = vertex.index;
      this.selectedVertex = vertex.geometry.coordinates;
      this.mgrs = mgrs.forward(this.selectedVertex);
      this.setFieldValues();
    });
  }

  saveLocation() {
    if (this.feature.geometry.type) {
      if (this.GeometryService.featureHasIntersections(this.feature)) {
        this.invalidGeometrySnackbar.open();
        return;
      }

      this.featureEdit.save();
      this.saveEdit({value: this.feature});
    } else {
      this._MapService.removeFeatureFromLayer({ id: this.feature.id }, 'Observations');
      this.featureEdit.cancel();
      this.saveEdit({value: undefined});
    }
  }

  cancel() {
    this.featureEdit.cancel();
    this.cancelEdit();
  }

  coordinateSystemChange(coordinateSystem) {
    this._LocalStorageService.setCoordinateSystemEdit(coordinateSystem);
    this.coordinateSystem = coordinateSystem;
    if (coordinateSystem === 'mgrs') {
      this.mgrs = this.toMgrs(this.feature);
    }

    this._$timeout(() => {
      this.initializeTextFields();
      this.setFieldValues();
    });
  }

  toMgrs(feature) {
    switch (feature.geometry.type) {
    case 'Point':
      return mgrs.forward(feature.geometry.coordinates);
    case 'LineString':
      return mgrs.forward(feature.geometry.coordinates[this.selectedVertexIndex]);
    case 'Polygon':
      return mgrs.forward(feature.geometry.coordinates[0][this.selectedVertexIndex]);
    }
  }

  onLatLngChange() {
    var coordinates = angular.copy(this.feature.geometry.coordinates);

    // copy edit field lat/lng in coordinates at correct index
    if (this.feature.geometry.type === 'Point') {
      coordinates = angular.copy([Number(this.longitudeField.value), Number(this.latitudeField.value)]);
    } else if (this.feature.geometry.type === 'LineString') {
      coordinates[this.selectedVertexIndex] = angular.copy([Number(this.longitudeField.value), Number(this.latitudeField.value)]);
    } else if (this.feature.geometry.type === 'Polygon') {
      if (coordinates[0]) {
        coordinates[0][this.selectedVertexIndex] = angular.copy([Number(this.longitudeField.value), Number(this.latitudeField.value)]);
      }
    }

    // transform corrdinates to valid GeoJSON
    this.toGeoJSON(this.feature, coordinates);

    // Check for polygon for intersections
    if (this.hasIntersections(this.feature, coordinates)) {
      return;
    }

    this.feature.geometry.coordinates = coordinates;
    this.featureEdit.update(this.feature);
  }

  onMgrsChange() {
    try {
      this.toLatLng();
      this.mgrsField.valid = true;
    } catch(e) {
      this.mgrsField.valid = false;
    }
  }

  toLatLng() {
    var coordinates = angular.copy(this.feature.geometry.coordinates);

    switch (this.feature.geometry.type) {
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
    this.toGeoJSON(this.feature, coordinates);

    this.feature.geometry.coordinates = coordinates;
    this.featureEdit.update(this.feature);
  }

  hasIntersections(feature, coordinates) {
    if (feature.geometry.type !== 'Point') {
      if (this._GeometryService.featureHasIntersections({geometry: {coordinates: coordinates}})) {
        return true;
      }
    }

    return false;
  }

  toGeoJSON(feature, coordinates) {
    // Ensure first and last points are the same for polygon
    if (feature.geometry.type === 'Polygon') {
      if (feature.editedVertex === 0) {
        coordinates[0][coordinates[0].length - 1] = coordinates[0][0];
      } else if (feature.editedVertex === coordinates[0].length - 1) {
        coordinates[0][0] = coordinates[0][coordinates[0].length - 1];
      }
    }
  }

  setFieldValues() {
    if (this.latitudeField) {
      this.longitudeField.value = this.selectedVertex[0];
      this.latitudeField.value = this.selectedVertex[1];
    }

    if (this.mgrsField) {
      this.mgrsField.value = this.mgrs;
    }
  }

  shapeTypeChanged(shapeType) {
    switch(shapeType) {
    case 'Point':
      this.feature.geometry.coordinates = [];
      this.feature.geometry.type = 'Point';
      break;
    case 'LineString':
      this.feature.geometry.coordinates = [];
      this.feature.geometry.type = 'LineString';
      break;
    case 'Polygon':
      this.feature.geometry.coordinates = [];
      this.feature.geometry.type = 'Polygon';
      break;
    default:
      this._$timeout(() => {
        this.longitudeField.value = '';
        this.latitudeField.value = '';
        delete this.feature.geometry.type;
        this.featureEdit.cancel();
      });
      break;
    }

    if (shapeType) this.onEditShape();
  }

  onEditShape() {
    this.featureEdit.update(this.feature);
  }

  updateSelectedVertex() {
    if (this.feature.geometry.type === 'Point') {
      this.selectedVertex = [this.feature.geometry.coordinates[0], this.feature.geometry.coordinates[1]];
    } else if (this.feature.geometry.type === 'Polygon') {
      this.selectedVertex = [this.feature.geometry.coordinates[0][this.selectedVertexIndex][0], this.feature.geometry.coordinates[0][this.selectedVertexIndex][1]];
    } else if (this.feature.geometry.type === 'LineString') {
      this.selectedVertex = [this.feature.geometry.coordinates[this.selectedVertexIndex][0], this.feature.geometry.coordinates[this.selectedVertexIndex][1]];
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

GeometryEditFormController.$inject = ['$element', '$timeout', 'MapService', 'GeometryService', 'LocalStorageService'];

export default {
  template: template,
  bindings: {
    feature: '<',
    clearable: '<',
    onFieldChanged: '&',
    cancelEdit: '&',
    saveEdit: '&'
  },
  controller: GeometryEditFormController
};
