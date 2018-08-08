var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , app = require('../../express')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token')
  , UserModel = mongoose.model('User');

require('sinon-mongoose');

require('../../models/device');
var DeviceModel = mongoose.model('Device');

describe("device update tests", function() {

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

  it("should update device", function(done) {
    mockTokenWithPermission('UPDATE_DEVICE');

    var userId = mongoose.Types.ObjectId();
    sandbox.mock(DeviceModel)
      .expects('findByIdAndUpdate')
      .chain('exec')
      .resolves({
        uid: '12345',
        name: 'Test Device',
        registered: true,
        description: 'Some description',
        userId: userId.toString()
      });

    request(app)
      .put('/api/devices/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        uid: '12345',
        name: 'Test Device',
        registered: true,
        description: 'Some description',
        userId: userId.toString()
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var device = res.body;
        should.exist(device);
      })
      .end(done);
  });

  it("should update empty device", function(done) {
    mockTokenWithPermission('UPDATE_DEVICE');

    var userId = mongoose.Types.ObjectId();
    sandbox.mock(DeviceModel)
      .expects('findByIdAndUpdate')
      .withArgs('123', {})
      .chain('exec')
      .resolves({
        uid: '12345',
        name: 'Test Device',
        registered: true,
        description: 'Some description',
        userId: userId.toString()
      });

    request(app)
      .put('/api/devices/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({})
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var device = res.body;
        should.exist(device);
      })
      .end(done);
  });


  it("should remove token for unregistered device", function(done) {
    mockTokenWithPermission('UPDATE_DEVICE');

    var userId = mongoose.Types.ObjectId();

    var deviceId = mongoose.Types.ObjectId();
    sandbox.mock(TokenModel.collection)
      .expects('remove')
      .withArgs({ deviceId: deviceId})
      .yields(null);

    sandbox.mock(UserModel)
      .expects('findById')
      .withArgs(userId)
      .chain('populate')
      .chain('exec')
      .yields(null, {});

    sandbox.mock(DeviceModel.collection)
      .expects('findAndModify')
      .yields(null, {
        value: {
          uid: '12345',
          name: 'Test Device',
          registered: false,
          description: 'Some description',
          userId: userId.toString()
        }
      });

    request(app)
      .put('/api/devices/' + deviceId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        uid: '12345',
        name: 'Test Device',
        registered: 'false',
        description: 'Some description',
        userId: userId.toString()
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var device = res.body;
        should.exist(device);
      })
      .end(done);
  });

});
