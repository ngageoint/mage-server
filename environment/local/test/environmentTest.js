var sinon = require('sinon')
  , proxyquire = require('proxyquire')
  , should = require('chai').should();

describe("local environment tests", function() {
  var environment = require('../env');

  it("environment should provide port", function() {
    environment.should.have.property('port');
  });

  it("environment should provide address", function() {
    environment.should.have.property('address');
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

  it("environment should provide mongo", function() {
    var mongo = require('environment').mongo;
    should.exist(mongo);
    mongo.should.have.property('uri');
    mongo.should.have.property('scheme');
    mongo.should.have.property('host');
    mongo.should.have.property('port');
    mongo.should.have.property('db');
    mongo.should.have.property('poolSize');
  });

  it("environment should provide token expiration", function() {
    environment.should.have.property('tokenExpiration');
  });
  
});
