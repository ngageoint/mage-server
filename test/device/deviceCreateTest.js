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

require('../../models/user');
var UserModel = mongoose.model('User');

describe("device create tests", function() {

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

  it("should create registered device", function(done) {
    mockTokenWithPermission('CREATE_DEVICE');

    var userId = mongoose.Types.ObjectId();
    sandbox.mock(DeviceModel)
      .expects('findOneAndUpdate')
      .withArgs({
        uid: '12345'
      },{
        description: "Some description",
        name: "Test Device",
        registered: true,
        userId: userId.toString(),
        appVersion: undefined,
        userAgent: undefined
      })
      .yields(null, {
        uid: '12345',
        name: 'Test Device',
        description: 'Some description',
        userId: userId.toString()
      });

    request(app)
      .post('/api/devices')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        uid: '12345',
        name: 'Test Device',
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

  it("should create unregistered device", function(done) {
    mockTokenWithPermission('NO_PERMISSION');

    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sandbox.mock(mockUser)
      .expects('validPassword')
      .yields(null, true);

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({username: 'test'})
      .chain('populate')
      .chain('exec')
      .yields(null, mockUser);

    sandbox.mock(DeviceModel)
      .expects('findOne')
      .withArgs({
        uid: '12345'
      })
      .yields(null, null);

    sandbox.mock(DeviceModel)
      .expects('findOneAndUpdate')
      .withArgs({
        uid: '12345'
      },{
        description: "Some description",
        name: "Test Device",
        userId: userId.toString(),
        appVersion: undefined,
        userAgent: undefined
      })
      .yields(null, {
        uid: '12345',
        name: 'Test Device',
        description: 'Some description',
        userId: userId.toString()
      });

    request(app)
      .post('/api/devices')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'test',
        uid: '12345',
        name: 'Test Device',
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

  it("should skip create unregistered device if exists", function(done) {
    mockTokenWithPermission('NO_PERMISSION');

    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sandbox.mock(mockUser)
      .expects('validPassword')
      .yields(null, true);

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({username: 'test'})
      .chain('populate')
      .chain('exec')
      .yields(null, mockUser);

    sandbox.mock(DeviceModel)
      .expects('findOne')
      .withArgs({
        uid: '12345'
      })
      .yields(null, {
        uid: '12345'
      });

    request(app)
      .post('/api/devices')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'test',
        uid: '12345',
        name: 'Test Device',
        description: 'Some description',
        userId: userId.toString()
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var device = res.body;
        should.exist(device);
        device.should.have.property('uid').that.equals('12345');
      })
      .end(done);
  });

  it("should fail to create registered device w/o uid", function(done) {
    mockTokenWithPermission('CREATE_DEVICE');

    request(app)
      .post('/api/devices')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Test Device',
        description: 'Some description',
        userId: userId.toString()
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("missing required param 'uid'");
      })
      .end(done);
  });

});
