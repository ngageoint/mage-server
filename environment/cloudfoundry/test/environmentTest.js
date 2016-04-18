var should = require('chai').should()
  , proxyquire = require('proxyquire');

describe("cloud foundry environment tests", function() {

  process.env['CLOUDFOUNDRY'] = "cf";

  var environment = proxyquire('../env', {
    'cfenv': {
      getAppEnv: function() {
        return {
          getServiceCreds: function() {
            return {
              uri: 'mongodb://127.0.0.1:2727/magedb',
              scheme: 'mongodb',
              host: '127.0.0.1',
              port: 2727,
              database: 'magedb',
              username: 'username',
              password: 'password',
              poolSize: 5
            };
          }
        };
      }
    }
  });

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

  it("environment should provide mongo", function() {
    console.log('mongo is', environment.mongo);
    var mongo = environment.mongo;
    should.exist(mongo);
    mongo.should.have.property('uri').to.exist;
    mongo.should.have.property('scheme').to.exist;
    mongo.should.have.property('host').to.exist;
    mongo.should.have.property('port').to.exist;
    mongo.should.have.property('db').to.exist;
    mongo.should.have.property('username').to.exist;
    mongo.should.have.property('password').to.exist;
    mongo.should.have.property('poolSize').to.exist;
  });

  it("environment should provide token expiration", function() {
    environment.should.have.property('tokenExpiration');
  });

});
