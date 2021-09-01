const util = require('util')
  , Field = require('./field');

function TextField(fieldDefinition, form) {
  TextField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
}
util.inherits(TextField, Field);

TextField.prototype.validate = function() {
  const error = TextField.super_.prototype.validate.call(this);
  if (error) return error;

  if (!this.value) return;

  if (this.value != null && !isString(this.value)) {
    return { error: 'value', message: `${this.definition.title} must be a String` }
  }
};

module.exports = TextField;

function isString(value) {
  return toString.call(value) === '[object String]';
}
