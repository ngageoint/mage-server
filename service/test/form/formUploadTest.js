var sinon = require('sinon')
  , proxyquire = require('proxyquire');

require('chai').should();
require('sinon-mongoose');

describe("form upload tests", function() {

  this.timeout(300000);

  afterEach(function() {
    sinon.restore();
  });

  it("should remove archived fields in uploaded form", function(done) {
    var file = {
      fieldname: 'form',
      originalname: 'form.zip',
      mimetype: 'application/zip',
      extension: 'zip'
    };

    let form = {
      fields: [{
        archived: true,
        name: 'field0'
      },{
        name: 'field1'
      }],
      primaryField: null,
      variantField: null,
      userFields: []
    };

    let jsonStub = sinon.stub().returns(JSON.stringify(form));
    let iconsStub = sinon.stub().withArgs('form/icons/').returns(true);
    function Zip() {
      return {
        readAsText: jsonStub,
        getEntry: iconsStub
      };
    }

    let Form = proxyquire('../../api/form', {
      'adm-zip': Zip
    });

    new Form().validate(file, function(err, form) {
      jsonStub.should.have.been.calledWith('form/form.json');
      iconsStub.should.have.been.calledWith('form/icons/');
      form.should.have.property('fields');
      form.fields.should.be.a('array');
      form.fields.should.have.length(1);
      done(err);
    });
  });

  it("should reorder fields in uploaded form", function(done) {
    var file = {
      fieldname: 'form',
      originalname: 'form.zip',
      mimetype: 'application/zip',
      extension: 'zip'
    };

    let form = {
      fields: [{
        id: 1,
        name: 'field1'
      },{
        id: 0,
        name: 'field0'
      }],
      primaryField: null,
      variantField: null,
      userFields: []
    };

    let jsonStub = sinon.stub().returns(JSON.stringify(form));
    let iconsStub = sinon.stub().withArgs('form/icons/').returns(true);
    function Zip() {
      return {
        readAsText: jsonStub,
        getEntry: iconsStub
      };
    }

    let Form = proxyquire('../../api/form', {
      'adm-zip': Zip
    });

    new Form().validate(file, function(err, form) {
      jsonStub.should.have.been.calledWith('form/form.json');
      iconsStub.should.have.been.calledWith('form/icons/');
      form.should.have.property('fields');
      form.fields.should.be.a('array');
      form.fields.should.have.length(2);
      form.fields[0].should.have.property('id').that.equals(0);
      form.fields[1].should.have.property('id').that.equals(1);
      done(err);
    });
  });

  it("should rename fields in uploaded form", function(done) {
    var file = {
      fieldname: 'form',
      originalname: 'form.zip',
      mimetype: 'application/zip',
      extension: 'zip'
    };

    let form = {
      fields: [{
        id: 1,
        name: 'second'
      },{
        id: 0,
        name: 'first'
      }],
      primaryField: null,
      variantField: null,
      userFields: []
    };

    let jsonStub = sinon.stub().returns(JSON.stringify(form));
    let iconsStub = sinon.stub().withArgs('form/icons/').returns(true);
    function Zip() {
      return {
        readAsText: jsonStub,
        getEntry: iconsStub
      };
    }

    let Form = proxyquire('../../api/form', {
      'adm-zip': Zip
    });

    new Form().validate(file, function(err, form) {
      jsonStub.should.have.been.calledWith('form/form.json');
      iconsStub.should.have.been.calledWith('form/icons/');
      form.should.have.property('fields');
      form.fields.should.be.a('array');
      form.fields.should.have.length(2);
      form.fields[0].should.have.property('name').that.equals('field0');
      form.fields[1].should.have.property('name').that.equals('field1');
      done(err);
    });
  });

  it("should re-map primary field in uploaded form", function(done) {
    var file = {
      fieldname: 'form',
      originalname: 'form.zip',
      mimetype: 'application/zip',
      extension: 'zip'
    };

    let form = {
      fields: [{
        id: 1,
        name: 'second'
      },{
        id: 0,
        name: 'first'
      }],
      primaryField: 'first',
      variantField: null,
      userFields: []
    };

    let jsonStub = sinon.stub().returns(JSON.stringify(form));
    let iconsStub = sinon.stub().withArgs('form/icons/').returns(true);
    function Zip() {
      return {
        readAsText: jsonStub,
        getEntry: iconsStub
      };
    }

    let Form = proxyquire('../../api/form', {
      'adm-zip': Zip
    });

    new Form().validate(file, function(err, form) {
      jsonStub.should.have.been.calledWith('form/form.json');
      iconsStub.should.have.been.calledWith('form/icons/');
      form.should.have.property('fields');
      form.primaryField.should.equal('field0');
      done(err);
    });
  });

  it("should re-map variant field in uploaded form", function(done) {
    var file = {
      fieldname: 'form',
      originalname: 'form.zip',
      mimetype: 'application/zip',
      extension: 'zip'
    };

    let form = {
      fields: [{
        id: 1,
        name: 'second'
      },{
        id: 0,
        name: 'first'
      }],
      primaryField: null,
      variantField: 'second',
      userFields: []
    };

    let jsonStub = sinon.stub().returns(JSON.stringify(form));
    let iconsStub = sinon.stub().withArgs('form/icons/').returns(true);
    function Zip() {
      return {
        readAsText: jsonStub,
        getEntry: iconsStub
      };
    }

    let Form = proxyquire('../../api/form', {
      'adm-zip': Zip
    });

    new Form().validate(file, function(err, form) {
      jsonStub.should.have.been.calledWith('form/form.json');
      iconsStub.should.have.been.calledWith('form/icons/');
      form.should.have.property('fields');
      form.variantField.should.equal('field1');
      done(err);
    });
  });

  it("should re-map userFields in uploaded form", function(done) {
    var file = {
      fieldname: 'form',
      originalname: 'form.zip',
      mimetype: 'application/zip',
      extension: 'zip'
    };

    let form = {
      fields: [{
        id: 1,
        name: 'second'
      },{
        id: 0,
        name: 'first'
      }],
      primaryField: null,
      variantField: null,
      userFields: ['first', 'first']
    };

    let jsonStub = sinon.stub().returns(JSON.stringify(form));
    let iconsStub = sinon.stub().withArgs('form/icons/').returns(true);
    function Zip() {
      return {
        readAsText: jsonStub,
        getEntry: iconsStub
      };
    }

    let Form = proxyquire('../../api/form', {
      'adm-zip': Zip
    });

    new Form().validate(file, function(err, form) {
      jsonStub.should.have.been.calledWith('form/form.json');
      iconsStub.should.have.been.calledWith('form/icons/');
      form.should.have.property('fields');
      form.userFields.should.be.a('array').with.length(1);
      form.userFields[0].should.equal('field0');
      done(err);
    });
  });
});
