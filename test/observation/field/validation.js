var expect = require('chai').expect
  , FieldFactory = require('../../../api/field');

var factory = new FieldFactory();

it("should pass validation for required field", function() {
  var definition = {
    name: 'test',
    title: 'test',
    required: true
  };

  var value = 'non null value';

  var field = factory.createField(definition, value);
  expect(field.validate.bind(field)).to.not.throw(Error);
});

it("should fail validation for required field", function() {
  var definition = {
    name: 'test',
    title: 'test',
    required: true
  };

  var value =  null;

  var field = factory.createField(definition, value);
  expect(field.validate.bind(field)).to.throw(Error);
});

it("should pass validation for date field", function() {
  var definition = {
    name: 'test',
    title: 'test',
    required: true,
    type: 'date'
  };

  var observation =  {
    properties: {
      'test': '2016-01-01T00:00:00'
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.not.throw(Error);
});

it("should throw validation error for invalid date field", function() {
  var definition = {
    name: 'test',
    title: 'test',
    required: true,
    type: 'date'
  };

  var observation =  {
    properties: {
      'test': new Date()
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.throw(Error);
});

it("should pass validation for geometry field", function() {
  var definition = {
    name: 'test',
    title: 'test',
    required: true,
    type: 'geometry'
  };

  var observation =  {
    geometry: {
      type: 'Point',
      coordinates: [0,0]
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.not.throw(Error);
});

it("should throw validation error for invalid geometry field", function() {
  var definition = {
    name: 'test',
    title: 'test',
    required: true,
    type: 'geometry'
  };

  var observation =  {
    geometry: {
      type: 'LineString',
      coordinates: [0,0]
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.throw(Error);
});

it("should pass validation for textfield field", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'textfield'
  };

  var observation =  {
    properties: {
      'test': 'text value'
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.not.throw(Error);
});

it("should throw validation error for invalid textfield field", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'textfield'
  };

  var observation =  {
    properties: {
      'test': 1
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.throw(Error);
});

it("should pass validation for textarea field", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'textarea'
  };

  var observation =  {
    properties: {
      'test': 'text value'
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.not.throw(Error);
});

it("should throw validation error for invalid textarea field", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'textarea'
  };

  var observation =  {
    properties: {
      'test': 1
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.throw(Error);
});

it("should pass validation for numberfield field", function() {
  var definition = {
    name: 'test',
    title: 'test',
    required: true,
    type: 'numberfield',
    min: 0,
    max: 10
  };

  var observation =  {
    properties: {
      'test': 5
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.not.throw(Error);
});

it("should throw validation error for invalid numberfield field that is less than min", function() {
  var definition = {
    name: 'test',
    title: 'test',
    required: true,
    type: 'numberfield',
    min: 5,
    max: 10
  };

  var observation =  {
    properties: {
      'test': 1
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.throw(Error);
});

it("should throw validation error for invalid numberfield field that is greater than min", function() {
  var definition = {
    name: 'test',
    title: 'test',
    required: true,
    type: 'numberfield',
    min: 5,
    max: 10
  };

  var observation =  {
    properties: {
      'test': 20
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.throw(Error);
});

it("should pass validation for emailfield", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'emailfield'
  };

  var observation =  {
    properties: {
      'test': 'test@test.com'
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.not.throw(Error);
});

it("should throw validation error for invalid emailfield", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'emailfield'
  };

  var observation =  {
    properties: {
      'test': "invalidemail"
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.throw(Error);
});

it("should pass validation for radiofield", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'dropdown',
    choices: [{
      title: 'red'
    },{
      title: 'blue'
    }]
  };

  var observation =  {
    properties: {
      'test': 'red'
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.not.throw(Error);
});

it("should throw validation error for invalid radiofield", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'dropdown',
    choices: [{
      title: 'red'
    },{
      title: 'blue'
    }]
  };

  var observation =  {
    properties: {
      'test': "green"
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.throw(Error);
});

it("should pass validation for dropdown", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'dropdown',
    choices: [{
      title: 'red'
    },{
      title: 'blue'
    }]
  };

  var observation =  {
    properties: {
      'test': 'red'
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.not.throw(Error);
});

it("should throw validation error for invalid dropdown", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'dropdown',
    choices: [{
      title: 'red'
    },{
      title: 'blue'
    }]
  };

  var observation =  {
    properties: {
      'test': "green"
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.throw(Error);
});

it("should pass validation for checkbox", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'checkbox'
  };

  var observation =  {
    properties: {
      'test': true
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.not.throw(Error);
});

it("should throw validation error for invalid checkbox", function() {
  var definition = {
    name: 'test',
    title: 'test',
    type: 'checkbox'
  };

  var observation =  {
    properties: {
      'test': "not a boolean"
    }
  };

  var field = factory.createField(definition, observation);
  expect(field.validate.bind(field)).to.throw(Error);
});
