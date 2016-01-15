var sinon = require('sinon')
  , proxyquire = require('proxyquire')
  , should = require('chai').should();

describe("cloud foundry environment tests", function() {

  process.env['CLOUDFOUNDRY'] = "cf";
  var environment = require('../env');

  it("environment should provide port", function() {
    environment.should.have.property('port').that.is.not.null;
  });

  it("environment should provide address", function() {
    environment.should.have.property('address').that.is.not.null;
  });

  it("environment should provide attachment base directory", function() {
    environment.should.have.property('attachmentBaseDirectory');
  });

  it("environment should provide icon base directory", function() {
    environment.should.have.property('iconBaseDirectory');
  });

  it("environment should provide user base directory", function() {
    environment.should.have.property('userBaseDirectory');
  });

  xit("environment should provide mongo", function() {
    var mongo = environment.mongo;
    should.exist(mongo);
    mongo.should.have.property('uri');
    mongo.should.have.property('scheme');
    mongo.should.have.property('host');
    mongo.should.have.property('port');
    mongo.should.have.property('db');
    mongo.should.have.property('poolSize');
  });

});
