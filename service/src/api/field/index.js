const Field = require('./field')
  , AttachmentField = require('./attachmentField')
  , DateField = require('./dateField')
  , GeometryField = require('./geometryField')
  , NumberField = require('./numberField')
  , TextField = require('./textField')
  , EmailField  = require('./emailField')
  , SelectField = require('./selectField')
  , MultiSelectField = require('./multiSelectField')
  , CheckboxField = require('./checkboxField');

function FieldFactory() {
  const fields = {
    attachment: AttachmentField,
    date: DateField,
    geometry: GeometryField,
    textfield: TextField,
    textarea: TextField,
    password: TextField,
    numberfield: NumberField,
    emailfield: EmailField,
    radiofield: SelectField,
    dropdown: SelectField,
    multiselectdropdown: MultiSelectField,
    checkbox: CheckboxField
  };

  this.getField = function(type) {
    let field = fields[type];
    if (!field) {
      field = Field;
    }

    return field;
  };
}

FieldFactory.prototype.createField = function(fieldDefinition, observationForm, observation) {
  return new (this.getField(fieldDefinition.type))(fieldDefinition, observationForm, observation);
};

module.exports = FieldFactory;
