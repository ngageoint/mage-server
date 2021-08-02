var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/device');
var DeviceModel = mongoose.model('Device');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

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

    app = require('../../express');
  });

  afterEach(function() {
    sinon.restore();
  });

  var userId = mongoose.Types.ObjectId();
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

    var userId = mongoose.Types.ObjectId();
    var mockDevice = new DeviceModel({
      uid: '12345',
      name: 'Test Device',
      registered: true,
      description: 'Some description',
      userId: userId.toString()
    });
    sinon.mock(DeviceModel)
      .expects('findById')
      .chain('exec')
      .resolves(mockDevice);

    sinon.mock(mockDevice)
      .expects('remove')
      .chain('exec')
      .resolves(mockDevice);

    request(app)
      .delete('/api/devices/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var device = res.body;
        should.exist(device);
      })
      .end(done);
  });

  it("should fail to delete device that does not exist", function(done) {
    mockTokenWithPermission('DELETE_DEVICE');

    sinon.mock(DeviceModel)
      .expects('findById')
      .chain('exec')
      .resolves(null);

    request(app)
      .delete('/api/devices/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(404)
      .end(done);
  });

});
