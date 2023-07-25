'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , TokenModel = require('../../lib/models/token')
  , DeviceModel = require('../../lib/models/device')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('sinon-mongoose');

describe("device read tests", function () {

  let app;

  beforeEach(function () {
    const configs = [];
    const config = {
      name: 'local',
      type: 'local'
    };
    configs.push(config);

    sinon.mock(AuthenticationConfiguration)
      .expects('getAllConfigurations')
      .resolves(configs);

    sinon.mock(SecurePropertyAppender)
      .expects('appendToConfig')
      .resolves(config);

    app = require('../../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission]));
  }

  it("should get devices", function (done) {
    mockTokenWithPermission('READ_DEVICE');

    sinon.mock(DeviceModel)
      .expects('getDevices')
      .resolves([{
        uid: '123'
      }, {
        uid: '456'
      }]);

    request(app)
      .get('/api/devices')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const devices = res.body;
        should.exist(devices);
      })
      .end(done);
  });

  it("should get devices and populate user", function (done) {
    mockTokenWithPermission('READ_DEVICE');

    const mockDevices = [{
      uid: '123'
    }, {
      uid: '456'
    }];
    sinon.mock(DeviceModel)
      .expects('getDevices')
      .resolves(mockDevices);

    request(app)
      .get('/api/devices')
      .query({ expand: 'user' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const devices = res.body;
        should.exist(devices);
      })
      .end(done);
  });

  it("should get registered devices", function (done) {
    mockTokenWithPermission('READ_DEVICE');

    sinon.mock(DeviceModel)
      .expects('getDevices')
      .resolves([{
        uid: '123'
      }, {
        uid: '456'
      }]);

    request(app)
      .get('/api/devices')
      .query({ registered: 'true' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const devices = res.body;
        should.exist(devices);
      })
      .end(done);
  });

  it("should get unregistered devices", function (done) {
    mockTokenWithPermission('READ_DEVICE');

    sinon.mock(DeviceModel)
      .expects('getDevices')
      .resolves([{
        uid: '123'
      }, {
        uid: '456'
      }]);

    request(app)
      .get('/api/devices')
      .query({ registered: 'false' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const devices = res.body;
        should.exist(devices);
      })
      .end(done);
  });

  it("should get device by id", function (done) {
    mockTokenWithPermission('READ_DEVICE');

    sinon.mock(DeviceModel)
      .expects('getDeviceById')
      .resolves({
        uid: '123'
      });

    request(app)
      .get('/api/devices/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .query({ expand: 'user' })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const device = res.body;
        should.exist(device);
        device.should.have.property('uid').that.equals('123');
      })
      .end(done);
  });

  it("should count devices", function (done) {
    mockTokenWithPermission('READ_DEVICE');

    sinon.mock(DeviceModel)
      .expects('count')
      .resolves(2);

    request(app)
      .get('/api/devices/count')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const body = res.body;
        should.exist(body);
        body.should.have.property('count').that.equals(2);
      })
      .end(done);
  });

});
