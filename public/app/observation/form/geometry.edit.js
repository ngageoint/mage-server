var angular = require('angular');

module.exports = {
  template: require('./geometry.edit.html'),
  bindings: {
    field: '<',
    onFieldChanged: '&',
    onShapeChanged: '&'
  },
  controller: GeometryEditController
};

GeometryEditController.$inject = ['GeometryService'];

function GeometryEditController(GeometryService) {

  this.shapes = [{
    display: 'Point',
    value: 'Point'
  },{
    display: 'Line',
    value: 'LineString'
  },{
    display: 'Polygon',
    value: 'Polygon'
  }];

  this.shape = {
    type: this.field.value.type
  };

  this.validateShapeChange = function() {
    if (!this.shape || !this.shape.type || this.shape.type === this.field.value.type) return;

    switch(this.shape.type) {
    case 'Point':
      this.field.value.coordinates = [];
      this.field.value.type = 'Point';
      break;
    case 'LineString':
      this.field.value.coordinates = [];
      this.field.value.type = 'LineString';
      break;
    case 'Polygon':
      this.field.value.coordinates = [[]];
      this.field.value.type = 'Polygon';
      break;
    }

    this.field.value.type = this.shape.type;
  };

  this.shapeTypeChanged = function(shapeType) {
    this.shape.type = shapeType;
    this.validateShapeChange();
  };

  this.onLatLngChange = function() {

    var coordinates = angular.copy(this.field.value.coordinates);

    // copy edit field lat/lng in coordinates at correct index
    if (this.field.value.type === 'LineString') {
      coordinates[this.field.editedVertex] = angular.copy(this.field.edit);
    } else if (this.field.value.type === 'Polygon') {
      if (coordinates[0]) {
        coordinates[0][this.field.editedVertex] = angular.copy(this.field.edit);
      }
    }

    // transform corrdinates to valid GeoJSON
    toGeoJSON(this.field, coordinates);

    // Check for polygon for intersections
    if (hasIntersections(this.field, coordinates)) {
      return;
    }

    this.field.value.coordinates = coordinates;
  };

  function toGeoJSON(field, coordinates) {
    // Ensure first and last points are the same for polygon
    if (field.value.type === 'Polygon') {
      if (field.editedVertex === 0) {
        coordinates[0][coordinates[0].length - 1] = coordinates[0][0];
      } else if (field.editedVertex === coordinates[0].length - 1) {
        coordinates[0][0] = coordinates[0][coordinates[0].length - 1];
      }
    }
  }

  function hasIntersections(field, coordinates) {
    if (field.value.type !== 'Point') {
      if (GeometryService.featureHasIntersections({geometry: {coordinates: coordinates}})) {
        if (field.value.type === 'LineString') { // Is it ok for line string to intersect
          field.edit = angular.copy(field.value.coordinates[field.editedVertex]);
        } else if (field.value.type === 'Polygon') {
          if (field.value.coordinates[0]) {
            field.edit = angular.copy(field.value.coordinates[0][field.editedVertex]);
          }
        }

        return true;
      }
    }

    return false;
  }

}
