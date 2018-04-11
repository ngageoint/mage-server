const
expect = require('chai').expect,
proxyquire = require('proxyquire').noPreserveCache();

describe("environment", function() {

  beforeEach("clear environment", function() {
    [
      'MAGE_ADDRESS',
      'MAGE_PORT',
      'MAGE_USER_DIR',
      'MAGE_ICON_DIR',
      'MAGE_ATTACHMENT_DIR',
      'MAGE_TOKEN_EXPIRATION',
      'MAGE_MONGO_URL',
      'MAGE_MONGO_SSL',
      'MAGE_MONGO_USER',
      'MAGE_MONGO_PASSWORD',
      'MAGE_MONGO_POOL_SIZE',
      'MAGE_MONGO_CONN_TIMEOUT',
      'MAGE_MONGO_CONN_RETRY_DELAY',
      'PORT',
      'ADDRESS',
      'VCAP_APPLICATION',
      'VCAP_SERVICES'
    ].forEach(key => delete process.env[key]);
  });

  it("provides default values", function() {

    const environment = proxyquire('../../environment/env', {});

    expect(environment).to.have.property('address', '0.0.0.0');
    expect(environment).to.have.property('port', 4242);
    expect(environment).to.have.property('attachmentBaseDirectory', '/var/lib/mage/attachments');
    expect(environment).to.have.property('iconBaseDirectory', '/var/lib/mage/icons');
    expect(environment).to.have.property('userBaseDirectory', '/var/lib/mage/users');
    expect(environment).to.have.property('tokenExpiration', 28800);
    const mongo = environment.mongo;
    expect(mongo).to.have.property('uri', 'mongodb://127.0.0.1:27017/magedb');
    expect(mongo).to.have.property('connectRetryDelay', 5000);
    expect(mongo).to.have.property('connectTimeout', 300000);
    const options = mongo.options;
    expect(options).to.have.property('useMongoClient', true);
    expect(options).to.have.property('poolSize', 5);
    expect(options).to.have.property('ssl', false);
    expect(options).to.not.have.property('auth');
  });

  describe("in default runtime", function() {
    
    it('loads values from env vars', function() {

      Object.assign(process.env, {
        MAGE_ADDRESS: '64.32.16.8',
        MAGE_PORT: '2424',
        MAGE_USER_DIR: '/test/users',
        MAGE_ICON_DIR: '/test/icons',
        MAGE_ATTACHMENT_DIR: '/test/attachments',
        MAGE_TOKEN_EXPIRATION: '6000',
        MAGE_MONGO_URL: 'mongodb-test://db.test.mage:54545/magedbtest',
        MAGE_MONGO_SSL: 'true',
        MAGE_MONGO_USER: 'mage_test',
        MAGE_MONGO_PASSWORD: 'test_mage',
        MAGE_MONGO_POOL_SIZE: '87',
        MAGE_MONGO_CONN_TIMEOUT: '12345',
        MAGE_MONGO_CONN_RETRY_DELAY: '15'
      });
      const environment = proxyquire('../../environment/env', {});

      expect(environment).to.have.property('address', '64.32.16.8');
      expect(environment).to.have.property('port', 2424);
      expect(environment).to.have.property('attachmentBaseDirectory', '/test/attachments');
      expect(environment).to.have.property('iconBaseDirectory', '/test/icons');
      expect(environment).to.have.property('userBaseDirectory', '/test/users');
      expect(environment).to.have.property('tokenExpiration', 6000);
      const mongo = environment.mongo;
      expect(mongo).to.have.property('uri', 'mongodb-test://db.test.mage:54545/magedbtest');
      expect(mongo).to.have.property('connectRetryDelay', 15000);
      expect(mongo).to.have.property('connectTimeout', 12345000);
      const options = mongo.options;
      expect(options).to.have.property('useMongoClient', true);
      expect(options).to.have.property('poolSize', 87);
      expect(options).to.have.property('ssl', true);
      expect(options).to.have.deep.property('auth', { "user": "mage_test", "password": "test_mage" });
    });
  });

  describe("in cloud foundry", function() {
    
    it("loads values from vcap env vars", function() {

      process.env.PORT = '2424';
      process.env.MAGE_TOKEN_EXPIRATION = '3600';
      process.env.VCAP_APPLICATION = '{}';
      process.env.VCAP_SERVICES = JSON.stringify({
        "user-provided": [
          {
            name: 'MongoInstance',
            credentials: {
              url: 'mongodb-cf://db.test.mage:27999/magedb_cf',
              username: 'cloudfoundry',
              password: 'foundrycloud',
              poolSize: 99
            }
          }
        ]
      });
      const environment = proxyquire('../../environment/env', {});

      expect(environment).to.have.property('port', 2424);
      expect(environment).to.have.property('address', '0.0.0.0');
      expect(environment).to.have.property('attachmentBaseDirectory', '/var/lib/mage/attachments');
      expect(environment).to.have.property('iconBaseDirectory', '/var/lib/mage/icons');
      expect(environment).to.have.property('userBaseDirectory', '/var/lib/mage/users');
      expect(environment).to.have.property('tokenExpiration', 3600);
      expect(environment).to.have.property('mongo');
      const mongo = environment.mongo;
      expect(mongo).to.have.property('uri', 'mongodb-cf://db.test.mage:27999/magedb_cf');
      expect(mongo).to.have.property('connectRetryDelay', 5000);
      expect(mongo).to.have.property('connectTimeout', 300000);
      const options = mongo.options;
      expect(options).to.have.property('useMongoClient', true);
      expect(options).to.have.property('ssl', false);
      expect(options).to.have.property('poolSize', 99);
      expect(options).to.have.deep.property('auth', { "user": "cloudfoundry", "password": "foundrycloud" });
    });
  });
});
