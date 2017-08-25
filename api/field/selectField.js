var util = require('util')
  , Field = require('./field');

function ComboField(fieldDefinition, form) {
  ComboField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
}

util.inherits(ComboField, Field);

ComboField.prototype.validate = function() {
  ComboField.super_.prototype.validate.call(this);

  if (!this.value) return;

  this.value.trim();

  var choices = this.definition.choices.filter(function(choice) {
    return choice.title === this.value;
  }, this);

  if (choices.length === 0) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property must be one of '" + this.definition.choices + "'");
  }
};

module.exports = ComboField;
