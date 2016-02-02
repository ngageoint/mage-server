var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , app = require('../../express')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/device');
var DeviceModel = mongoose.model('Device');

describe("device delete tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sandbox.mock(TokenModel)
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
    sandbox.mock(DeviceModel)
      .expects('findById')
      .yields(null, mockDevice);

    sandbox.mock(mockDevice)
      .expects('remove')
      .yields(null, mockDevice);

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

    sandbox.mock(DeviceModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .delete('/api/devices/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(404)
      .end(done);
  });

});
