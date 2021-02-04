const util = require('util')
  , Field = require('./field');

function ComboField(fieldDefinition, form) {
  ComboField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
}

util.inherits(ComboField, Field);

ComboField.prototype.validate = function() {
  const error = ComboField.super_.prototype.validate.call(this);
  if (error) return error;

  if (!this.value) return;

  this.value.trim();

  const choices = this.definition.choices.filter(function(choice) {
    return choice.title === this.value;
  }, this);

  if (choices.length === 0) {
    return { error: 'value', message: `${this.definition.title} must be one of: ${this.definition.choices.map(choice => choice.title)}` }
  }
};

module.exports = ComboField;
