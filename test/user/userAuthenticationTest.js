var request = require('supertest')
  , sinon = require('sinon')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , mongoose = require('mongoose');

require('../../models/token');
var TokenModel = mongoose.model('Token');

require('../../models/login');
var LoginModel = mongoose.model('Login');

require('../../models/device');
var DeviceModel = mongoose.model('Device');

require('../../models/user');
var UserModel = mongoose.model('User');

require('sinon-mongoose');

describe("user authentication tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function() {
    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(mongoose.Types.ObjectId(), ['READ_USER']));
  });

  afterEach(function() {
    sandbox.restore();
  });

  it("should login user", function(done) {
    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);

    sandbox.mock(UserModel.prototype)
      .expects('validPassword')
      .yields(null, true);

    sandbox.mock(DeviceModel)
      .expects('findOne')
      .withArgs({uid: '1'})
      .yields(null, {
        uid: '1',
        registered: true
      });

    sandbox.mock(TokenModel)
      .expects('findOneAndUpdate')
      .yields(null, {
        token: 'token'
      });

    sandbox.mock(LoginModel)
      .expects('create')
      .withArgs({
        userId: userId.toString(),
        deviceId: '1'
      })
      .yields(null, {});

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'password',
        uid: '1'
      })
      .expect(200)
      .end(done);
  });

  it("should fail login with inactive user", function(done) {
    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: false,
      authentication: {
        type: 'local'
      }
    });

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'password'
      })
      .expect(401)
      .end(done);
  });


  it("should fail login with invalid local account", function(done) {
    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {}
    });

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'none'
      })
      .expect(401)
      .end(done);
  });

  it("should fail login with invalid uid", function(done) {
    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);

    sandbox.mock(UserModel.prototype)
      .expects('validPassword')
      .yields(null, true);

    sandbox.mock(DeviceModel)
      .expects('findOne')
      .withArgs({uid: '1'})
      .yields(null, {
        uid: '1',
        registered: true
      });

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'password',
        uid: '2'
      })
      .expect(500)
      .end(done);
  });

  it("should fail login with unregistered uid", function(done) {
    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);

    sandbox.mock(UserModel.prototype)
      .expects('validPassword')
      .yields(null, true);

    sandbox.mock(DeviceModel)
      .expects('findOne')
      .withArgs({uid: '1'})
      .yields(null, {
        uid: '1',
        registered: false
      });

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'password',
        uid: '1'
      })
      .expect(401)
      .end(done);
  });

  it("should logout without token", function(done) {
    sandbox.mock(TokenModel)
      .expects('findByIdAndRemove')
      .withArgs("1")
      .yields(null);

    request(app)
      .post('/api/logout')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .end(done);
  });

  it("should logout with token", function(done) {
    sandbox.mock(TokenModel)
      .expects('findByIdAndRemove')
      .withArgs("1")
      .yields(null);

    request(app)
      .post('/api/logout')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .expect(function(res) {
        res.text.should.equal('successfully logged out');
      })
      .end(done);
  });

});
