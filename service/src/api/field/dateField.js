const util = require('util')
  , moment = require('moment')
  , Field = require('./field');

function DateField(fieldDefinition, form) {
  DateField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
  this.form = form;
}
util.inherits(DateField, Field);

DateField.prototype.validate = function() {
  const error = DateField.super_.prototype.validate.call(this);
  if (error) return error;

  if (!this.value) return;

  const date = moment(this.value, moment.ISO_8601, true);
  if (!date.isValid()) {
    return { error: 'value', message: `${this.definition.title} must be an ISO8601 string` }
  }

  this.form[this.definition.name] = date.toDate();
};

module.exports = DateField;
