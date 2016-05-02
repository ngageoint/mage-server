var util = require('util')
  , geoJsonValidator = require('geojson-validation')
  , Field = require('./field');

function GeometryField(fieldDefinition, observation) {
  GeometryField.super_.call(this, fieldDefinition, observation.geometry);
}
util.inherits(GeometryField, Field);

GeometryField.prototype.validate = function() {
  GeometryField.super_.prototype.validate.call(this);

  if (!geoJsonValidator.isPoint(this.value)) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property must be a valid GeoJson point");
  }
};

module.exports = GeometryField;
