var request = require('supertest')
  , sinon = require('sinon')
  , expect = require('chai').expect
  , moment = require('moment')
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

require('../../models/setting');
var SettingModel = mongoose.model('Setting');

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
      roleId: mongoose.Types.ObjectId(),
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

    sandbox.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

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
      roleId: mongoose.Types.ObjectId(),
      active: true,
      authentication: {}
    });

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);

    sandbox.mock(SettingModel)
      .expects('findOne')
      .withArgs({ type: 'security' })
      .chain('exec')
      .resolves({
        settings: {
          accountLock: {
            threshold: 3,
            max: 3,
            interval: 60
          }
        }
      });

    sandbox.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

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
      roleId: mongoose.Types.ObjectId(),
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
      roleId: mongoose.Types.ObjectId(),
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

    sandbox.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

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

  it("should increment number of times locked on invalid login", function(done) {
    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        security: {
          invalidLoginAttempts: 1
        }
      }
    });

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);


    sandbox.mock(SettingModel)
      .expects('findOne')
      .withArgs({ type: 'security' })
      .chain('exec')
      .resolves({
        settings: {
          accountLock: {
            threshold: 3,
            max: 3,
            interval: 60
          }
        }
      });

    let userSpy = sandbox.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'none'
      })
      .expect(401)
      .end(function(err) {
        expect(userSpy.callCount).to.equal(1);
        expect(userSpy.thisValues[0].authentication.security.invalidLoginAttempts).to.equal(2);
        done(err);
      });
  });

  it("should lock account after invalid logins pass threshold", function(done) {
    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        security: {
          invalidLoginAttempts: 2
        }
      }
    });

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);


    sandbox.mock(SettingModel)
      .expects('findOne')
      .withArgs({ type: 'security' })
      .chain('exec')
      .resolves({
        settings: {
          accountLock: {
            threshold: 3,
            max: 3,
            interval: 60
          }
        }
      });

    let userSpy = sandbox.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'none'
      })
      .expect(401)
      .end(function(err) {
        expect(userSpy.callCount).to.equal(1);
        expect(userSpy.thisValues[0].authentication.security.locked).to.equal(true);
        expect(userSpy.thisValues[0].authentication.security.numberOfTimesLocked).to.equal(1);
        expect(userSpy.thisValues[0].authentication.security.lockedUntil).to.be.a('date');
        expect(userSpy.thisValues[0].authentication.security.lockedUntil).to.be.above(new Date());
        done(err);
      });
  });

  it("should failed to login with locked account", function(done) {
    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        security: {
          locked: true,
          lockedUntil: moment().add(5, 'minutes')
        }
      }
    });

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);


    sandbox.mock(SettingModel)
      .expects('findOne')
      .withArgs({ type: 'security' })
      .chain('exec')
      .resolves({
        settings: {
          accountLock: {
            threshold: 3,
            max: 3,
            interval: 60
          }
        }
      });

    sandbox.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'none'
      })
      .expect(401)
      .end(function(err, response) {
        expect(response.text).to.equal('Your account has been temporarily locked, please try again later or contact a MAGE administrator for assistance.');
        done(err);
      });
  });

  it("should failed to login with disabled account", function(done) {
    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      enabled: false,
      authentication: {
      }
    });

    sandbox.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);


    sandbox.mock(SettingModel)
      .expects('findOne')
      .withArgs({ type: 'security' })
      .chain('exec')
      .resolves({
        settings: {
          accountLock: {
            threshold: 3,
            max: 3,
            interval: 60
          }
        }
      });

    sandbox.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'none'
      })
      .expect(401)
      .end(function(err, response) {
        expect(response.text).to.equal('Your account has been disabled, please contact a MAGE administrator for assistance.');
        done(err);
      });
  });

});
