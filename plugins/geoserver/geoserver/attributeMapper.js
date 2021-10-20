const util = require('util')
  , log = require('winston')
  , cname = require('../cname');

function fieldFilter(field) {
  return !field.archived && field.name !== 'geometry';
}

exports.attributesForEvent = function(event) {
  const attributes = {
    attribute: [{
      name: 'geometry',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'org.locationtech.jts.geom.Geometry'
    },{
      name: 'timestamp',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'java.util.Date'
    },{
      name: 'url',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'java.lang.String'
    },{
      name: 'event_id',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'java.lang.Integer'
    },{
      name: 'form_id',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'java.lang.Integer'
    },{
      name: 'event_name',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: "java.lang.String"
    },{
      name: 'user_username',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'java.lang.String'
    },{
      name: 'user_displayName',
      minOccurs: 0,
      maxOccurs: 1,
      nillable: true,
      binding: 'java.lang.String'
    }]
  };

  event.forms.forEach(form => {
    form.fields.filter(fieldFilter).forEach(field => {
      attributes.attribute.push(attributeForField(field, form));
    });
  });

  return attributes;
};

exports.descriptorsForEvent = function(event) {
  const descriptors = [{
    localName: 'geometry',
    type: {
      binding: 'org.locationtech.jts.geom.Geometry'
    },
    userData: {
      mapping: 'geometry',
      encoding: "GeoJSON"
    }
  },{
    localName: 'timestamp',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.util.Date'
    },
    userData: {
      mapping: 'properties.timestamp'
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
    localName: 'event_id',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.Integer'
    },
    userData: {
      mapping: 'properties.event._id'
    }
  },{
    localName: 'form_id',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.Integer'
    },
    userData: {
      mapping: 'properties.formId'
    }
  },{
    localName: 'event_name',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.String'
    },
    userData: {
      mapping: 'properties.event.name'
    }
  },{
    localName: 'user_username',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.String'
    },
    userData: {
      mapping: 'properties.user.username'
    }
  },{
    localName: 'user_displayName',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.String'
    },
    userData: {
      mapping: 'properties.user.displayName'
    }
  }];

  event.forms.forEach(form => {
    form.fields.filter(fieldFilter).forEach(field => {
      descriptors.push(descriptorForField(field, form));
    });
  });

  return descriptors;
};

function attributeForField(field, form) {
  return {
    name: cname.generateCName(`${form.name}_${field.title}`),
    minOccurs: 0,
    maxOccurs: 1,
    nillable: true,
    binding: binding(field)
  };
}

function descriptorForField(field, form) {
  return {
    localName: cname.generateCName(`${form.name}_${field.title}`),
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: binding(field)
    },
    userData: {
      mapping: util.format('properties.forms.%s.%s', form._id, field.name)
    }
  };
}

const bindingMap = {
  date:  'java.util.Date',
  geometry: 'org.locationtech.jts.geom.Geometry',
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
  let type = bindingMap[field.type];

  if (!type) {
    log.warn('No java binding for type ' + field.type);
    type = 'java.lang.Object';
  }

  return type;
}
