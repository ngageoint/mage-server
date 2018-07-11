var util = require('util')
  , turfKinks= require('@turf/kinks')
  , geoJsonValidator = require('geojson-validation')
  , Field = require('./field');

geoJsonValidator.define('Position', function(position) {
  let errors = [];
  if (position[0] < -180 || position[0] > 180) {
    errors.push('Longitude must be between -180 and 180');
  }

  if (position[1] < -90 || position[1] > 90) {
    errors.push('Latitude y must be between -90 and 90');
  }

  return errors;
});

function GeometryField(fieldDefinition, form) {
  GeometryField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
}
util.inherits(GeometryField, Field);

GeometryField.prototype.validate = function() {
  GeometryField.super_.prototype.validate.call(this);

  if (!this.value) return;

  if (!geoJsonValidator.isGeometryObject(this.value)) {
    throw new Error("Cannot create observation, '" + this.definition.title + "' property must be a valid GeoJson geometry");
  }

  if (this.value.type === 'Polygon') {
    var kinks = turfKinks(this.value);
    if (kinks.features.length > 0) {
      throw new Error('Observation polygon geometry cannot intersect itself.');
    }
  }
};

module.exports = GeometryField;
