var util = require('util')
  , Field = require('./field');

function TextField(fieldDefinition, observation) {
  TextField.super_.call(this, fieldDefinition, observation.properties[fieldDefinition.name]);
}
util.inherits(TextField, Field);

TextField.prototype.validate = function() {
  TextField.super_.prototype.validate.call(this);

  if (this.value != null && !isString(this.value)) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property must be a string");
  }
};

module.exports = TextField;

function isString(value) {
  return toString.call(value) === '[object String]';
}
