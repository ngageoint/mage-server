const util = require('util')
  , Field = require('./field');

function NumberField(fieldDefinition, form) {
  NumberField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
}
util.inherits(NumberField, Field);

NumberField.prototype.validate = function() {
  const error = NumberField.super_.prototype.validate.call(this);
  if (error) return error;

  if (!this.value) return;

  if (this.value != null && !isNumber(this.value)) {
    return { error: 'value', message: `${this.definition.title} must be a Number` }
  }

  if (this.definition.min != null && this.value < this.definition.min) {
    return { error: 'min', message: `${this.definition.title} must be greater than or equal to ${this.definition.min}` }
  }

  if (this.definition.max != null && this.value > this.definition.max) {
    return { error: 'max', message: `${this.definition.title} must be less than or equal to ${this.definition.max}` }
  }
};

module.exports = NumberField;

function isNumber(value) {
  return toString.call(value) === '[object Number]';
}
