const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , app = require('../../express')
  , Setting = require('../../models/setting');

require('sinon-mongoose');

require('../../models/token');
var TokenModel = mongoose.model('Token');

require('../../models/login');
var LoginModel = mongoose.model('Login');

require('../../models/device');
var DeviceModel = mongoose.model('Device');

require('../../models/user');
var UserModel = mongoose.model('User');

let userId = mongoose.Types.ObjectId();
let mockUser = new UserModel({
  _id: userId,
  username: 'test',
  displayName: 'test',
  active: true,
  enabled: true,
  roleId: mongoose.Types.ObjectId(),
  authentication: {
    type: 'local'
  }
});

async function authenticate() {
  userId = mongoose.Types.ObjectId();
  mockUser = new UserModel({
    _id: userId,
    username: 'test',
    displayName: 'test',
    active: true,
    enabled: true,
    roleId: mongoose.Types.ObjectId(),
    authentication: {
      type: 'local'
    }
  });

  sinon.mock(UserModel)
    .expects('findOne')
    .withArgs({ username: 'test' })
    .chain('populate', 'roleId')
    .chain('exec')
    .yields(null, mockUser);

  sinon.mock(UserModel.prototype)
    .expects('validPassword')
    .yields(null, true);

  sinon.mock(mockUser)
    .expects('save')
    .resolves(mockUser);

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
      .chain('populate')
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
      .chain('populate')
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
        var body = res.body;
        body.should.have.property('token').that.equals('token');

        body.should.have.property('device');
        var device = body.device;
        device.should.have.property('uid').that.equals('test');

        body.should.have.property('user');
      })
      .end(done);
  });

  it("device provisioning should default to enabled", function (done) {
    const deviceId = mongoose.Types.ObjectId();

    sinon.mock(UserModel)
      .expects('findById')
      .chain('populate')
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
        var body = res.body;
        body.should.have.property('token').that.equals('token');

        body.should.have.property('device');
        var device = body.device;
        device.should.have.property('uid').that.equals('test');

        body.should.have.property('user');
      })
      .end(done);
  });
});
