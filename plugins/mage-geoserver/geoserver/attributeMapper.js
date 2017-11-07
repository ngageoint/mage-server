var util = require('util')
  , log = require('winston')
  , cname = require('../cname');

function fieldFilter(field) {
  return !field.archived && field.name !== 'geometry';
}

exports.attributesFromForm = function(form) {
  var attributes = {
    attribute: [{
      name: 'geometry',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'com.vividsolutions.jts.geom.Geometry'
    },{
      name: 'url',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'java.lang.String'
    },{
      name: 'event.id',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'java.lang.Integer'
    },{
      name: 'event.name',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: "java.lang.String"
    },{
      name: 'user.username',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'java.lang.String'
    },{
      name: 'user.displayName',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'java.lang.String'
    }]
  };

  form.fields.filter(fieldFilter).forEach(function(field) {
    attributes.attribute.push(attributeForField(field));
  });

  return attributes;
};

exports.descriptorsFromForm = function(form) {
  var descriptors = [{
    localName: 'geometry',
    type: {
      binding: 'com.vividsolutions.jts.geom.Geometry'
    },
    userData: {
      mapping: 'geometry',
      encoding: "GeoJSON"
    }
  },{
    localName: 'url',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.String'
    },
    userData: {
      mapping: 'properties.url'
    }
  },{
    localName: 'event.id',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.Integer'
    },
    userData: {
      mapping: 'properties.event._id'
    }
  },{
    localName: 'event.name',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.String'
    },
    userData: {
      mapping: 'properties.event.name'
    }
  },{
    localName: 'user.username',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.String'
    },
    userData: {
      mapping: 'properties.user.username'
    }
  },{
    localName: 'user.displayName',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.String'
    },
    userData: {
      mapping: 'properties.user.displayName'
    }
  }];

  form.fields.filter(fieldFilter).forEach(function(field) {
    descriptors.push(descriptorForField(field));
  });

  return descriptors;
};

function attributeForField(field) {
  return {
    name: cname.generateCName(field.title),
    minOccurs: 0,
    maxOccurs: 1,
    nillable: true,
    binding: binding(field)
  };
}

function descriptorForField(field) {
  return {
    localName: cname.generateCName(field.title),
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: binding(field)
    },
    userData: {
      mapping: util.format('properties.%s', field.name)
    }
  };
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
