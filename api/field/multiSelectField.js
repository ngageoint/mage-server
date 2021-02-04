const util = require('util')
  , Field = require('./field');

function MultiSelectField(fieldDefinition, form) {
  MultiSelectField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
}

util.inherits(MultiSelectField, Field);

MultiSelectField.prototype.validate = function() {
  const error = MultiSelectField.super_.prototype.validate.call(this);
  if (error) return error;

  if (!this.value) return;

  if (!Array.isArray(this.value)) {
    return { error: 'value', message: `${this.definition.title} must be an Array` }
  }

  const invalid = this.value.some(value => {
    const choices = this.definition.choices.filter(choice => {
      return choice.title === value;
    }, this);

    return choices.length === 0;
  })

  if (invalid) {
    return { error: 'value', message: `${this.definition.title} must be one of: ${this.definition.choices.map(choice => choice.title)}` }
  }
};

module.exports = MultiSelectField;
