var util = require('util')
  , Field = require('./field');

function MultiSelectField(fieldDefinition, form) {
  MultiSelectField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
}
util.inherits(MultiSelectField, Field);

MultiSelectField.prototype.validate = function() {
  MultiSelectField.super_.prototype.validate.call(this);

  if (!this.value) return;

  if (!Array.isArray(this.value)) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property must be an array");
  }

  this.value.forEach(function(choice) {
    var choices = this.definition.choices.filter(function(c) {
      return c.title === choice;
    }, this);

    if (choices.length === 0) {
      throw new Error("cannot create observation, '" + this.definition.title + "' property must be one of '" + this.definition.choices + "'");
    }
  }, this);
};

module.exports = MultiSelectField;
