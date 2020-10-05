"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , expect = require('chai').expect
  , moment = require('moment')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , mongoose = require('mongoose')
  , Setting = require('../../models/setting');

require('../../models/token');
const TokenModel = mongoose.model('Token');

require('../../models/login');
const LoginModel = mongoose.model('Login');

require('../../models/device');
const DeviceModel = mongoose.model('Device');

require('../../models/user');
const UserModel = mongoose.model('User');

require('../../models/authentication');
const AuthenticationModel = mongoose.model('Authentication');

require('../../models/setting');
const SettingModel = mongoose.model('Setting');

require('sinon-mongoose');

describe("user authentication tests", function () {

  beforeEach(function () {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(mongoose.Types.ObjectId(), ['READ_USER']));
  });

  afterEach(function () {
    sinon.restore();
  });

  it("should login user", function (done) {
    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      roleId: mongoose.Types.ObjectId(),
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        security: {}
      })
    });
    mockUser.authentication = {
      security: {}
    };

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(Setting)
      .expects('getSetting')
      .withArgs('security')
      .resolves({
        _id: mongoose.Types.ObjectId(),
        type: 'security',
        settings: {
          local: { usersReqAdmin: { enabled: true }, devicesReqAdmin: { enabled: true } }
        }
      });

    sinon.mock(AuthenticationModel.prototype)
      .expects('validatePassword')
      .yields(null, true);

    sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

    sinon.mock(DeviceModel)
      .expects('findOne')
      .withArgs({ uid: '1' })
      .chain('exec')
      .resolves({
        uid: '1',
        registered: true
      });

    sinon.mock(TokenModel)
      .expects('findOneAndUpdate')
      .yields(null, {
        token: 'token'
      });

    sinon.mock(LoginModel)
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

  it("should fail login with inactive user", function (done) {
    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: false,
      authenticationId: mongoose.Types.ObjectId()
    });
    mockUser.authentication = {
      security: {}
    };

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
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

  it("should fail login with invalid local account", function (done) {
    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      roleId: mongoose.Types.ObjectId(),
      active: true,
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: {
          salt: '',
          derivedKey: '',
          iterations: 1,
          derivedKeyLength: 1
        },
        security: {}
      })
    });

    sinon.mock(AuthenticationModel)
      .expects('findById')
      .withArgs(mockUser.authenticationId._id)
      .chain('exec')
      .resolves(mockUser.authentication);

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(SettingModel)
      .expects('findOne')
      .withArgs({ type: 'security' })
      .chain('exec')
      .resolves({
        type: 'security',
        settings: {
          local: {
            accountLock: {
              enabled: true,
              threshold: 3,
              max: 3,
              interval: 60
            }
          }
        }
      });

    sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

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

  it("should fail login with invalid uid", function (done) {
    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      roleId: mongoose.Types.ObjectId(),
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'none',
        security: {}
      })
    });

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(AuthenticationModel.prototype)
      .expects('validatePassword')
      .yields(null, true);

    sinon.mock(DeviceModel)
      .expects('findOne')
      .withArgs({ uid: '2' })
      .chain('exec')
      .resolves(null);

    sinon.mock(SettingModel)
      .expects('findOne')
      .withArgs({ type: 'security' })
      .chain('exec')
      .resolves({
        type: 'security',
        settings: {
          local: {
          }
        }
      });

    sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

    request(app)
      .post('/api/login?createDevice=false')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'password',
        uid: '2'
      })
      .expect(403)
      .end(done);
  });

  it("should fail login with unregistered uid", function (done) {
    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      roleId: mongoose.Types.ObjectId(),
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'none',
        security: {}
      })
    });
    mockUser.authentication = {
      type: 'local',
      security: {}
    }

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(Setting)
      .expects('getSetting')
      .withArgs('security')
      .resolves({
        _id: mongoose.Types.ObjectId(),
        type: 'security',
        settings: {
          local: { usersReqAdmin: { enabled: true }, devicesReqAdmin: { enabled: true } }
        }
      });


    sinon.mock(AuthenticationModel.prototype)
      .expects('validatePassword')
      .yields(null, true);

    sinon.mock(DeviceModel)
      .expects('findOne')
      .withArgs({ uid: '1' })
      .chain('exec')
      .resolves({
        uid: '1',
        registered: false
      });

    sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'password',
        uid: '1'
      })
      .expect(403)
      .end(done);
  });

  it("should logout without token", function (done) {
    sinon.mock(TokenModel)
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

  it("should logout with token", function (done) {
    sinon.mock(TokenModel)
      .expects('findByIdAndRemove')
      .withArgs("1")
      .yields(null);

    request(app)
      .post('/api/logout')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .expect(function (res) {
        res.text.should.equal('successfully logged out');
      })
      .end(done);
  });

  it("should increment number of times locked on invalid login", function (done) {
    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'none',
        security: {
          invalidLoginAttempts: 1
        }
      })
    });

    sinon.mock(AuthenticationModel)
      .expects('findById')
      .withArgs(mockUser.authenticationId._id)
      .chain('exec')
      .resolves(mockUser.authentication);

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(SettingModel)
      .expects('findOne')
      .withArgs({ type: 'security' })
      .chain('exec')
      .resolves({
        type: 'security',
        settings: {
          local: {
            accountLock: {
              enabled: true,
              threshold: 3,
              max: 3,
              interval: 60
            }
          }
        }
      });

    sinon.mock(AuthenticationModel.prototype)
      .expects('validatePassword')
      .yields(null, false);

    let userSpy = sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'none'
      })
      .expect(401)
      .end(function (err) {
        expect(userSpy.callCount).to.equal(1);
        expect(userSpy.thisValues[0].security.invalidLoginAttempts).to.equal(2);
        done(err);
      });
  });

  it("should lock account after invalid logins pass threshold", function (done) {
    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'none',
        security: {
          numberOfTimesLocked: 0,
          invalidLoginAttempts: 2
        }
      })
    });

    sinon.mock(AuthenticationModel)
      .expects('findById')
      .withArgs(mockUser.authenticationId._id)
      .chain('exec')
      .resolves(mockUser.authentication);

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(Setting)
      .expects('getSetting')
      .withArgs('security')
      .resolves({
        settings: {
          local: {
            accountLock: {
              enabled: true,
              threshold: 3,
              max: 3,
              interval: 60
            }
          }
        }
      });

    sinon.mock(AuthenticationModel.prototype)
      .expects('validatePassword')
      .yields(null, false);

    let userSpy = sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'none'
      })
      .expect(401)
      .end(function (err) {
        expect(userSpy.callCount).to.equal(1);
        expect(userSpy.thisValues[0].security.locked).to.equal(true);
        expect(userSpy.thisValues[0].security.numberOfTimesLocked).to.equal(1);
        expect(userSpy.thisValues[0].security.lockedUntil).to.be.a('date');
        expect(userSpy.thisValues[0].security.lockedUntil).to.be.above(new Date());
        done(err);
      });
  });
  
  it("should disable account after invalid logins pass threshold", function (done) {
    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'none',
        security: {
          numberOfTimesLocked: 0,
          invalidLoginAttempts: 2
        }
      })
    });

    sinon.mock(AuthenticationModel)
      .expects('findById')
      .withArgs(mockUser.authenticationId._id)
      .chain('exec')
      .resolves(mockUser.authentication);

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(Setting)
      .expects('getSetting')
      .withArgs('security')
      .resolves({
        settings: {
          local: {
            accountLock: {
              enabled: true,
              threshold: 3,
              max: 1,
              interval: 60
            }
          }
        }
      });

    sinon.mock(AuthenticationModel.prototype)
      .expects('validatePassword')
      .yields(null, false);

    let userSpy = sinon.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

    let authenticationSpy = sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'none'
      })
      .expect(401)
      .end(function (err) {
        expect(userSpy.callCount).to.equal(1);
        expect(userSpy.thisValues[0].enabled).to.be.false;

        expect(authenticationSpy.callCount).to.equal(1);
        expect(authenticationSpy.thisValues[0].security.locked).to.be.undefined;
        expect(authenticationSpy.thisValues[0].security.lockedUntil).to.be.undefined;
        expect(authenticationSpy.thisValues[0].security.numberOfTimesLocked).to.be.undefined;
        expect(authenticationSpy.thisValues[0].security.invalidLoginAttempts).to.be.undefined;

        done(err);
      });
  });

  it("should fail to login with locked account", function (done) {
    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new AuthenticationModel({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'none',
        security: {
          locked: true,
          lockedUntil: moment().add(5, 'minutes')
        }
      })
    });

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .chain('exec')
      .yields(null, mockUser);


    sinon.mock(Setting)
      .expects('getSetting')
      .withArgs('security')
      .resolves({
        settings: {
          accountLock: {
            enabled: true,
            threshold: 3,
            max: 3,
            interval: 60
          }
        }
      });

    sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

    request(app)
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'none'
      })
      .expect(401)
      .end(function (err, response) {
        expect(response.text).to.equal('Your account has been temporarily locked, please try again later or contact a MAGE administrator for assistance.');
        done(err);
      });
  });

  it("should failed to login with disabled account", function (done) {
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

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);


    sinon.mock(Setting)
      .expects('getSetting')
      .withArgs('security')
      .resolves({
        settings: {
          accountLock: {
            enabled: true,
            threshold: 3,
            max: 3,
            interval: 60
          }
        }
      });

    sinon.mock(mockUser)
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
      .end(function (err, response) {
        expect(response.text).to.equal('Your account has been disabled, please contact a MAGE administrator for assistance.');
        done(err);
      });
  });

});
