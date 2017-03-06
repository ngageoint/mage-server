var log = require('winston');

function fieldFilter(field) {
  return !field.archived && field.name !== 'geometry';
}

exports.attributesFromForm = function(form) {
  var attributes = [];

  form.fields.filter(fieldFilter).forEach(function(field) {
    attributes.push(attributeFromField(field));
  });

  return attributes;
};

exports.descriptorsFromForm = function(form) {
  var attributes = [];

  form.fields.filter(fieldFilter).forEach(function(field) {
    attributes.push(descriptorFromField(field));
  });

  return attributes;
};

function attributeFromField(field) {
  return {
    name: 'properties.' + field.title,
    minOccurs: 0,
    maxOccurs: 1,
    nillable: true,
    binding: binding(field)
  };
}

function descriptorFromField(field) {
  var descriptor = {
    localName: 'properties.' + field.title,
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: binding(field)
    },
    userData: {
      mapping: 'properties.' + field.title
    }
  };

  return descriptor;
}

var bindingMap = {
  date:  'java.util.Date',
  geometry: 'com.vividsolutions.jts.geom.Geometry',
  dropdown: 'java.lang.String',
  userDropdown: 'java.lang.String',
  multiselectdropdown: 'java.lang.String',
  multiSelectUserDropdown: 'java.lang.String',
  radio: 'java.lang.String',
  textfield: 'java.lang.String',
  textarea: 'java.lang.String',
  password: 'java.lang.String',
  email: 'java.lang.String',
  numberfield: 'java.lang.Double',
  checkbox: 'java.lang.Boolean'
};

function binding(field) {
  var type = bindingMap[field.type];

  if (!type) {
    log.warn('No java binding for type ' + field.type);
    type = 'java.lang.Object';
  }

  return type;
}
