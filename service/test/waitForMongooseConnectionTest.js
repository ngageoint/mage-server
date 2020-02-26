"use strict";

const
chai = require('chai'),
sinon = require('sinon'),
sinonChai = require('sinon-chai'),
expect = chai.expect,
env = require('../environment/env'),
mongoose = require('mongoose'),
proxyquire = require('proxyquire').noPreserveCache();

chai.use(sinonChai);

const mocks = sinon.createSandbox();

describe('waitForMongooseConnection', function() {
  
  const retryDelay = env.mongo.connectRetryDelay;
  const connectTimeout = env.mongo.connectTimeout;
  const waitForMongooseConnection = proxyquire('../utilities/waitForMongooseConnection', {
    'mongoose': mongoose
  });
  let connectStub;
  
  beforeEach(function() {
    connectStub = mocks.stub(mongoose, 'connect');
  });

  afterEach(function() {
    mocks.restore();
  });

  it('retries after delay when first connection fails', function() {

    mocks.useFakeTimers();

    const firstConnect = new Promise(function(resolve, reject) {
      reject('first connect rejection');
    });
    connectStub.onFirstCall().callsFake(function() {
      process.nextTick(function() {
        firstConnect.catch(function() {
          mocks.clock.tick(retryDelay + 1);
        });
      })
      return firstConnect;
    });
    const connected = Promise.resolve();
    connectStub.onSecondCall().returns(connected);
    const connectTimeoutRejection = mocks.spy();

    return waitForMongooseConnection()
      .catch(connectTimeoutRejection)
      .then(() => {
        expect(connectStub).to.have.been.calledTwice;
        expect(connectTimeoutRejection).not.to.have.been.called;
      });

  }).timeout(retryDelay + 1);

  it('resolves when the connection succeeds', function() {

    const firstConnect = Promise.resolve();
    connectStub.onFirstCall().callsFake(function() {
      return firstConnect;
    });
    const connectTimeout = mocks.spy();
    return waitForMongooseConnection();
  });

  it('rejects when the connection timeout passes', function(done) {

    mocks.useFakeTimers();

    const firstConnect = new Promise(function(resolve, reject) {
      reject('first connect rejection');
    });
    connectStub.onFirstCall().callsFake(function() {
      process.nextTick(function() {
        firstConnect.catch(function() {
          mocks.clock.tick(connectTimeout + 1);
        });
      })
      return firstConnect;
    });
    const secondConnect = Promise.reject();
    connectStub.onSecondCall().returns(secondConnect);

    waitForMongooseConnection().catch(function(err) {
      expect(err).to.match(/^timed out/);
      done();
    });

  }).timeout(connectTimeout + 1);

});