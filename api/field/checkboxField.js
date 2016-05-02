var util = require('util')
  , Field = require('./field');

function CheckboxField(fieldDefinition, observation) {
  CheckboxField.super_.call(this, fieldDefinition, observation.properties[fieldDefinition.name]);
}
util.inherits(CheckboxField, Field);

CheckboxField.prototype.validate = function() {
  CheckboxField.super_.prototype.validate.call(this);

  if (this.value != null && !isBoolean(this.value)) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property must be a Boolean");
  }
};

module.exports = CheckboxField;

function isBoolean(value) {
  return toString.call(value) === '[object Boolean]';
}
