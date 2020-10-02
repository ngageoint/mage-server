"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , app = require('../../express')
  , Setting = require('../../models/setting');

require('sinon-mongoose');

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

let userId = mongoose.Types.ObjectId();
let mockUser = new UserModel({
  _id: userId,
  username: 'test',
  displayName: 'test',
  active: true,
  enabled: true,
  roleId: mongoose.Types.ObjectId(),
  authenticationId: mongoose.Types.ObjectId()
});
mockUser.authentication = {
  _id: mockUser.authenticationId,
  type: 'local', 
  security: {}
};

async function authenticate() {
  userId = mongoose.Types.ObjectId();
  mockUser = new UserModel({
    _id: userId,
    username: 'test',
    displayName: 'test',
    active: true,
    enabled: true,
    roleId: mongoose.Types.ObjectId(),
    authenticationId: new AuthenticationModel({
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password',
      security: {}
    })
  });
  mockUser.authentication = {
    _id: mockUser.authenticationId,
    type: 'local', 
    security: {}
  };

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

  sinon.mock(mockUser.authentication)
    .expects('save')
    .resolves(mockUser.authentication);

  let jwt;
  await request(app)
    .post('/auth/local/signin')
    .send({
      username: 'test',
      password: 'test'
    })
    .expect(200)
    .expect(function (res) {
      jwt = res.body.token;
      sinon.restore();
    });

  return jwt; 
}

describe("device provision tests", function() {
  let jwt;

  beforeEach(async () => {
    jwt = await authenticate();
  });

  afterEach(function() {
    sinon.restore();
  });

  it("should not authorize non provisioned device", function(done) {
    const deviceId = mongoose.Types.ObjectId();

    sinon.mock(UserModel)
      .expects('findById')
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(Setting)
      .expects('getSetting')
      .withArgs('security')
      .resolves({
        type: 'security',
        settings: {
          local: { usersReqAdmin: { enabled: true }, devicesReqAdmin: { enabled: true } }
        }
      });

    sinon.mock(DeviceModel)
      .expects('findOne')
      .withArgs({ uid: 'test' })
      .chain('exec')
      .resolves({
        _id: deviceId,
        uid: 'test',
        registered: false
      });

    sinon.mock(TokenModel)
      .expects('findOneAndUpdate')
      .yields(null, 'token');

    sinon.mock(LoginModel)
      .expects('create')
      .withArgs({
        userId: userId,
        deviceId: deviceId
      })
    .yields(null, {});

    const reqDevice = {
      uid: 'test',
      description: 'Some description',
      userId: userId.toHexString()
    };

    request(app)
      .post('/auth/local/authorize')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send(reqDevice)
      .expect(403)
      .end(done);
  });

  it("should authorize provisioned device", function (done) {
    const deviceId = mongoose.Types.ObjectId();

    sinon.mock(UserModel)
      .expects('findById')
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(Setting)
      .expects('getSetting')
      .withArgs('security')
      .resolves({
        type: 'security',
        settings: {
          local: { usersReqAdmin: { enabled: true }, devicesReqAdmin: { enabled: true } }
        }
      });

    sinon.mock(DeviceModel)
      .expects('findOne')
      .withArgs({ uid: 'test' })
      .chain('exec')
      .resolves({
        _id: deviceId,
        uid: 'test',
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
        userId: userId,
        deviceId: deviceId
      })
      .yields(null, {});

    const reqDevice = {
      uid: 'test',
      description: 'Some description',
      userId: userId.toHexString()
    };

    request(app)
      .post('/auth/local/authorize')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send(reqDevice)
      .expect(200)
      .expect(function (res) {
        const body = res.body;
        body.should.have.property('token').that.equals('token');

        body.should.have.property('device');
        const device = body.device;
        device.should.have.property('uid').that.equals('test');

        body.should.have.property('user');
      })
      .end(done);
  });

  it("device provisioning should default to enabled", function (done) {
    const deviceId = mongoose.Types.ObjectId();

    sinon.mock(UserModel)
      .expects('findById')
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(Setting)
      .expects('getSetting')
      .withArgs('security')
      .resolves(undefined);

    sinon.mock(DeviceModel)
      .expects('findOne')
      .withArgs({ uid: 'test' })
      .chain('exec')
      .resolves({
        _id: deviceId,
        uid: 'test',
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
        userId: userId,
        deviceId: deviceId
      })
      .yields(null, {});

    const reqDevice = {
      uid: 'test',
      description: 'Some description',
      userId: userId.toHexString()
    };

    request(app)
      .post('/auth/local/authorize')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send(reqDevice)
      .expect(200)
      .expect(function (res) {
        const body = res.body;
        body.should.have.property('token').that.equals('token');

        body.should.have.property('device');
        const device = body.device;
        device.should.have.property('uid').that.equals('test');

        body.should.have.property('user');
      })
      .end(done);
  });
});
