var expect = require('chai').expect
  , FieldFactory = require('../../../api/field');

var factory = new FieldFactory();

describe("field validation tests", function() {

  it("should pass validation for required field", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'dropdown',
      required: true,
      choices: [{
        title: 'non null value'
      }]
    };

    var form = {
      field1: 'non null value'
    };

    var field = factory.createField(definition, form);
    expect(field.validate.bind(field)).to.not.throw(Error);
  });

  it("should fail validation for required field", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'dropdown',
      required: true,
      choices: [{
        title: 'non null value'
      }]
    };

    var form = {};
    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('required')
    err.message.should.equal('test is required')
  });

  it("should pass validation for date field", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'date',
      required: true
    };

    var form = {
      field1: '2016-01-01T00:00:00'
    };

    var field = factory.createField(definition, form);
    expect(field.validate()).to.be.undefined;
  });

  it("should throw validation error for invalid date field", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'date',
      required: true
    };

    var form = {
      field1: 'invalid'
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('value')
    err.message.should.equal('test must be an ISO8601 string')
  });

  it("should pass validation for geometry field", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'geometry',
      required: true
    };

    var form = {
      field1: {
        type: 'Point',
        coordinates: [0,0]
      }
    };

    var field = factory.createField(definition, form);
    expect(field.validate()).to.be.undefined;
  });

  it("should throw validation error for invalid geometry field", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'geometry',
      required: true
    };

    var form = {
      field1: {
        type: 'LineString',
        coordinates: [0,0]
      }
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('value')
    err.message.should.equal('test must be GeoJSON')
  });

  it("should pass validation for textfield field", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'textfield',
      required: true
    };

    var form = {
      field1: 'text value'
    };

    var field = factory.createField(definition, form);
    expect(field.validate()).to.be.undefined;
  });

  it("should throw validation error for invalid textfield field", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'textfield',
      required: true
    };

    var form = {
      field1: 1
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('value')
    err.message.should.equal('test must be a String')
  });

  it("should pass validation for textarea field", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'textarea',
      required: true
    };

    var form = {
      field1: 'text value'
    };

    var field = factory.createField(definition, form);
    expect(field.validate()).to.be.undefined;
  });

  it("should throw validation error for invalid textarea field", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'textarea',
      required: true
    };

    var form = {
      field1: 1
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('value')
    err.message.should.equal('test must be a String')
  });

  it("should pass validation for numberfield field", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      required: true,
      type: 'numberfield',
      min: 0,
      max: 10
    };

    var form = {
      field1: 5
    };

    var field = factory.createField(definition, form);
    expect(field.validate()).to.be.undefined;
  });

  it("should throw validation error for invalid numberfield field that is less than min", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      required: true,
      type: 'numberfield',
      min: 5,
      max: 10
    };

    var form = {
      field1: 1
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('min')
    err.message.should.equal('test must be greater than or equal to 5')
  });

  it("should throw validation error for invalid numberfield field that is greater than min", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      required: true,
      type: 'numberfield',
      min: 5,
      max: 10
    };

    var form = {
      field1: 20
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('max')
    err.message.should.equal('test must be less than or equal to 10')
  });

  it("should pass validation for emailfield", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'emailfield',
      required: true
    };

    var form = {
      field1: 'test@test.com'
    };

    var field = factory.createField(definition, form);
    expect(field.validate()).to.be.undefined;
  });

  it("should throw validation error for invalid emailfield", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'emailfield',
      required: true
    };

    var form = {
      field1: "invalidemail"
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('value')
    err.message.should.equal('test must be valid email address')
  });

  it("should pass validation for radiofield", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'dropdown',
      required: true,
      choices: [{
        title: 'red'
      },{
        title: 'blue'
      }]
    };

    var form = {
      field1: 'red'
    };

    var field = factory.createField(definition, form);
    expect(field.validate()).to.be.undefined;
  });

  it("should throw validation error for invalid radiofield", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'dropdown',
      required: true,
      choices: [{
        title: 'red'
      },{
        title: 'blue'
      }]
    };

    var form = {
      field1: "green"
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('value')
    err.message.should.equal('test must be one of: red,blue')
  });

  it("should pass validation for dropdown", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'dropdown',
      required: true,
      choices: [{
        title: 'red'
      },{
        title: 'blue'
      }]
    };

    var form = {
      field1: 'red'
    };

    var field = factory.createField(definition, form);
    expect(field.validate()).to.be.undefined;
  });

  it("should throw validation error for invalid dropdown", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'dropdown',
      required: true,
      choices: [{
        title: 'red'
      },{
        title: 'blue'
      }]
    };

    var form = {
      field1: 'green'
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('value')
    err.message.should.equal('test must be one of: red,blue')
  });

  it("should pass validation for multiselectdropdown", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'multiselectdropdown',
      required: true,
      choices: [{
        title: 'red'
      },{
        title: 'blue'
      },{
        title: 'green'
      }]
    };

    var form = {
      field1: ['red', 'blue']
    };

    var field = factory.createField(definition, form);
    expect(field.validate()).to.be.undefined;
  });

  it("should throw validation error for invalid multiselectdropdown type", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'multiselectdropdown',
      required: true,
      choices: [{
        title: 'red'
      },{
        title: 'blue'
      }]
    };

    var form = {
      field1: 'green'
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('value')
    err.message.should.equal('test must be an Array')
  });

  it("should throw validation error for invalid multiselectdropdown choice", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'multiselectdropdown',
      required: true,
      choices: [{
        title: 'red'
      },{
        title: 'blue'
      }]
    };

    var form = {
      field1: ['red', 'green']
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    console.log('error is', err)
    err.error.should.equal('value')
    err.message.should.equal('test must be one of: red,blue')
  });

  it("should pass validation for checkbox", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'checkbox',
      required: true
    };

    var form = {
      field1: true
    };

    var field = factory.createField(definition, form);
    expect(field.validate()).to.be.undefined;
  });

  it("should throw validation error for invalid checkbox", function() {
    var definition = {
      name: 'field1',
      title: 'test',
      type: 'checkbox',
      required: true
    };

    var form = {
      field1: "not a boolean"
    };

    var field = factory.createField(definition, form);
    var err = field.validate();
    err.error.should.equal('value')
    err.message.should.equal('test must be a Boolean')
  });

});
