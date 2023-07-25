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

describe("device delete tests", function () {

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

  it("should delete device", function (done) {
    mockTokenWithPermission('DELETE_DEVICE');

    const userId = mongoose.Types.ObjectId();
    const deviceId = mongoose.Types.ObjectId();
    const uid = mongoose.Types.ObjectId();
    const mockDevice = {
      _id: deviceId.toHexString(),
      uid: uid.toHexString(),
      name: 'Test Device',
      registered: true,
      description: 'Some description',
      userId: userId.toString()
    };
    sinon.mock(DeviceModel)
      .expects('deleteDevice')
      .resolves(mockDevice);

    request(app)
      .delete('/api/devices/' + deviceId.toHexString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const device = res.body;
        should.exist(device);
      })
      .end(done);
  });

  it("should fail to delete device that does not exist", function (done) {
    mockTokenWithPermission('DELETE_DEVICE');

    const deviceId = mongoose.Types.ObjectId();

    sinon.mock(DeviceModel)
      .expects('deleteDevice')
      .resolves(null);

    request(app)
      .delete('/api/devices/' + deviceId.toHexString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(404)
      .end(done);
  });

});
