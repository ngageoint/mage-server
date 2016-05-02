function Field(definition, value) {
  this.definition = definition;
  this.value = value;
}

Field.prototype.validate = function() {
  if (this.definition.archived) return;

  if (this.definition.required && this.value == null) {
    throw new Error("cannot create observation, '" + this.definition.title + "' property is required");
  }
};

module.exports = Field;
