var util = require('util')
  , geoJsonValidator = require('geojson-validation')
  , Field = require('./field');

function GeometryField(fieldDefinition, form) {
  GeometryField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
}
util.inherits(GeometryField, Field);

GeometryField.prototype.validate = function() {
  GeometryField.super_.prototype.validate.call(this);

  if (!this.value) return;

  if (!geoJsonValidator.isGeometryObject(this.value)) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property must be a valid GeoJson geometry");
  }
};

module.exports = GeometryField;
