function Field(definition, value) {
  this.definition = definition;
  this.value = value;
}

Field.prototype.validate = function() {
  if (this.definition.required && this.value == null) {
    return { error: 'required', message: `${this.definition.title} is required` }
  }
};

module.exports = Field;
