const util = require('util')
  , TextField = require('./textField');

const emailRegex = /^[^\s@]+@[^\s@]+\./;

function EmailField(fieldDefinition, form) {
  EmailField.super_.call(this, fieldDefinition, form);
}

util.inherits(EmailField, TextField);

EmailField.prototype.validate = function() {
  const error = EmailField.super_.prototype.validate.call(this);
  if (error) return error;

  if (!this.value) return;

  if (!this.value.match(emailRegex)) {
    return { error: 'value', message: `${this.definition.title} must be valid email address` }
  }
};

module.exports = EmailField;
