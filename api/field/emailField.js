var util = require('util')
  , TextField = require('./textField');

var emailRegex = /^[^\s@]+@[^\s@]+\./;

function EmailField(fieldDefinition, observation) {
  EmailField.super_.call(this, fieldDefinition, observation);
}
util.inherits(EmailField, TextField);

EmailField.prototype.validate = function() {
  EmailField.super_.prototype.validate.call(this);

  if (!this.value) return;

  if (!this.value.match(emailRegex)) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property must be a valid email address");
  }
};

module.exports = EmailField;
