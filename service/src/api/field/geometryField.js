const util = require('util')
  , turfKinks= require('@turf/kinks')
  , geoJsonValidator = require('geojson-validation')
  , Field = require('./field');

geoJsonValidator.define('Position', function(position) {
  const errors = [];
  if (position[0] < -180 || position[0] > 180) {
    errors.push('longitude must be between -180 and 180');
  }

  if (position[1] < -90 || position[1] > 90) {
    errors.push('latitude y must be between -90 and 90');
  }

  return errors;
});

function GeometryField(fieldDefinition, form) {
  GeometryField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
}
util.inherits(GeometryField, Field);

GeometryField.prototype.validate = function() {
  const error = GeometryField.super_.prototype.validate.call(this);
  if (error) return error;

  if (!this.value) return;

  if (!geoJsonValidator.isGeometryObject(this.value)) {
    return { error: 'value', message: `${this.definition.title} must be GeoJSON` }
  }

  if (this.value.type === 'Polygon') {
    const kinks = turfKinks(this.value);
    if (kinks.features.length > 0) {
      return { error: 'value', message: `${this.definition.title} must not be a polygon that intersects itself` }
    }
  }
};

module.exports = GeometryField;
