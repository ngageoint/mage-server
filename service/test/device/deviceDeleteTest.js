const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../lib/models/device');
const DeviceModel = mongoose.model('Device');

const SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

describe("device delete tests", function() {

  let app;

  beforeEach(function() {
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

  afterEach(function() {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should delete device", function(done) {
    mockTokenWithPermission('DELETE_DEVICE');

    const userId = mongoose.Types.ObjectId();
    const deviceId = mongoose.Types.ObjectId();
    const uid = mongoose.Types.ObjectId();
    const mockDevice = new DeviceModel({
      _id: deviceId.toHexString(),
      uid: uid.toHexString(),
      name: 'Test Device',
      registered: true,
      description: 'Some description',
      userId: userId.toString()
    });
    sinon.mock(DeviceModel)
      .expects('findOneAndDelete')
      .chain('exec')
      .resolves(mockDevice);

    request(app)
      .delete('/api/devices/' + deviceId.toHexString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        const device = res.body;
        should.exist(device);
      })
      .end(done);
  });

  it("should fail to delete device that does not exist", function(done) {
    mockTokenWithPermission('DELETE_DEVICE');

    const deviceId = mongoose.Types.ObjectId();

    sinon.mock(DeviceModel)
      .expects('findOneAndDelete')
      .chain('exec')
      .resolves(null);

    request(app)
      .delete('/api/devices/' + deviceId.toHexString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(404)
      .end(done);
  });

});
