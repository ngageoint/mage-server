var util = require('util')
  , moment = require('moment')
  , Field = require('./field');

function DateField(fieldDefinition, form) {
  DateField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
  this.form = form;
}
util.inherits(DateField, Field);

DateField.prototype.validate = function() {
  DateField.super_.prototype.validate.call(this);

  if (!this.value) return;

  var date = moment(this.value, moment.ISO_8601, true);
  if (!date.isValid()) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property is not a valid ISO8601 date");
  }

  this.form[this.definition.name] = date.toDate();
};

module.exports = DateField;
