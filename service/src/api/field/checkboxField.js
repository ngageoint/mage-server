const util = require('util')
  , Field = require('./field');

function CheckboxField(fieldDefinition, form) {
  CheckboxField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
}
util.inherits(CheckboxField, Field);

CheckboxField.prototype.validate = function() {
  const error = CheckboxField.super_.prototype.validate.call(this);
  if (error) return error;

  if (this.value != null && !isBoolean(this.value)) {
    return { error: 'value', message: `${this.definition.title} must be a Boolean` }
  }
};

module.exports = CheckboxField;

function isBoolean(value) {
  return toString.call(value) === '[object Boolean]';
}
