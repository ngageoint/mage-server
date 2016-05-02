var util = require('util')
  , Field = require('./field');

function NumberField(fieldDefinition, observation) {
  NumberField.super_.call(this, fieldDefinition, observation.properties[fieldDefinition.name]);
}
util.inherits(NumberField, Field);

NumberField.prototype.validate = function() {
  NumberField.super_.prototype.validate.call(this);

  if (this.value != null && !isNumber(this.value)) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property must be a number");
  }

  if (this.definition.min != null && this.value < this.definition.min) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property must be greater than or equal to " + this.definition.min);
  }

  if (this.definition.max != null && this.value > this.definition.max) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property must be less than or equal to " + this.definition.max);
  }
};

module.exports = NumberField;

function isNumber(value) {
  return toString.call(value) === '[object Number]';
}
