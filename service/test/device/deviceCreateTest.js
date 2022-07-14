const request = require('supertest')
  , sinon = require('sinon')
  , chai = require('chai')
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , TokenModel = require('../../lib/models/token')
  , DeviceModel = require('../../lib/models/device')
  , UserOperations = require('../../lib/models/user')
  , UserModel = UserOperations.Model
  , AuthenticationModel = require('../../lib/models/authentication')
  , AuthenticationConfigurationModel = require('../../lib/models/authenticationconfiguration');

const expect = chai.expect;
const should = chai.should();

describe("device create tests", function () {

  let app;

  beforeEach(function () {
    const configs = [];
    const config = {
      name: 'local',
      type: 'local'
    };
    configs.push(config);

    sinon.mock(AuthenticationConfigurationModel)
      .expects('getAllConfigurations')
      .resolves(configs);

    sinon.mock(SecurePropertyAppender)
      .expects('appendToConfig')
      .resolves(config);

    app = require('../../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission]));
  }

  it("allows an admin to create a registered device", async function () {
    mockTokenWithPermission('CREATE_DEVICE');

    const deviceId = mongoose.Types.ObjectId();
    const uid = mongoose.Types.ObjectId();

    sinon.mock(UserOperations)
      .expects('getUserById').withArgs(userId.toHexString())
      .resolves({
        _id: userId,
        authenticationId: mongoose.Types.ObjectId()
      });

    const reqDevice = {
      uid: uid.toHexString(),
      description: 'Some description',
      userId: userId.toHexString()
    };

    const registeredDevice = {
      ...reqDevice,
      _id: deviceId.toHexString(),
      registered: true
    }

    sinon.mock(DeviceModel).expects('createDevice').resolves(registeredDevice);

    const res = await request(app)
      .post('/api/devices')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send(reqDevice);

    expect(res.status).to.equal(200)
    expect(res.type).to.match(/json/)
    expect(res.body).to.include({
      ...reqDevice,
      registered: true
    });
  });

  it("DEPRECATED: creates an unregistered device with local auth", async function () {
    mockTokenWithPermission('NO_PERMISSION');

    const deviceId = mongoose.Types.ObjectId();
    const uid = mongoose.Types.ObjectId();

    const authConfig = new AuthenticationConfigurationModel.Model({
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      name: 'local',
      settings: {}
    });

    const auth = new AuthenticationModel.Local({
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password',
      authenticationConfigurationId: authConfig
    });

    const user = new UserModel({
      _id: userId,
      username: 'unregisteredDeviceTest',
      displayName: 'Unregistered Device Test',
      roleId: mongoose.Types.ObjectId(),
      active: true,
      authenticationId: auth
    });

    const reqDevice = {
      uid: uid.toHexString(),
      description: 'Some description',
      appVersion: 'Some Version',
      userId: userId.toHexString()
    };

    const device = {
      _id: deviceId.toHexString(),
      ...reqDevice,
      registered: false
    };

    sinon.mock(AuthenticationConfigurationModel)
      .expects('getConfiguration')
      .resolves(authConfig);

    sinon.mock(auth)
      .expects('validatePassword').withArgs('test')
      .yields(null, true);

    const mockUserOps = sinon.mock(UserOperations);
    mockUserOps
      .expects('getUserByUsername').withArgs(user.username)
      .yields(null, user);
    mockUserOps
      .expects('validLogin')
      .resolves(user);

    const mockDeviceOps = sinon.mock(DeviceModel);
    mockDeviceOps
      .expects('getDeviceByUid')
      .resolves();
    mockDeviceOps
      .expects('createDevice')
      .resolves(device);

    const res = await request(app)
      .post('/api/devices')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: user.username,
        password: 'test',
        ...reqDevice
      });

    expect(res.status).to.equal(200);
    expect(res.type).to.match(/json/);
    expect(res.body).to.include(reqDevice);
    expect(res.body.registered).to.be.false
  });

  it("should skip create unregistered device if exists", function (done) {
    mockTokenWithPermission('NO_PERMISSION');

    const uid = mongoose.Types.ObjectId();

    const authConfig = new AuthenticationConfigurationModel.Model({
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      name: 'local',
      settings: {}
    });

    const auth = new AuthenticationModel.Local({
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password',
      authenticationConfigurationId: authConfig
    });

    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      roleId: mongoose.Types.ObjectId(),
      authenticationId: auth
    });

    sinon.mock(auth)
      .expects('validatePassword')
      .yields(null, true);

    sinon.mock(AuthenticationConfigurationModel)
      .expects('getConfiguration')
      .resolves(authConfig);

    sinon.mock(UserOperations)
      .expects('getUserByUsername')
      .withArgs('test')
      .yields(null, mockUser);

    sinon.mock(auth)
      .expects('save')
      .resolves(auth);

    const reqDevice = {
      username: 'test',
      password: 'test',
      uid: uid.toHexString(),
      name: 'Test Device',
      description: 'Some description',
      userId: mockUser.id
    }

    sinon.mock(DeviceModel).expects('createDevice').resolves(reqDevice);

    request(app)
      .post('/api/devices')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send(reqDevice)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const device = res.body;
        should.exist(reqDevice);
        device.should.have.property('uid').that.equals(uid.toHexString());
      })
      .end(done);
  });

  it("should fail to create registered device w/o uid", function (done) {
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
      .expect(function (res) {
        res.text.should.equal("missing required param 'uid'");
      })
      .end(done);
  });

  it('saves unregistered device', async function () {
    const unregisteredDevice = {
      uid: 'test',
      description: 'Some description',
      userId: userId.toHexString(),
      registered: false
    };

    sinon.mock(UserOperations)
      .expects('getUserById')
      .withArgs(userId.toHexString())
      .resolves({
        _id: userId,
        authentication: {
          type: 'local'
        }
      });

    sinon.mock(DeviceModel).expects('createDevice').resolves(unregisteredDevice);

    const device = await DeviceModel.createDevice(unregisteredDevice);
    chai.assert(device.registered === false, 'Settings should auto-register device');
  });

  it('saves registered device', async function () {
    const registeredDevice = {
      uid: 'test',
      description: 'Some description',
      userId: userId.toHexString(),
      registered: true
    };

    sinon.mock(UserOperations)
      .expects('getUserById')
      .withArgs(userId.toHexString())
      .resolves({
        _id: userId,
        authentication: {
          type: 'local'
        }
      });

    sinon.mock(DeviceModel).expects('createDevice').resolves(registeredDevice);


    const device = await DeviceModel.createDevice({
      uid: 'test',
      description: 'Some description',
      userId: userId.toHexString(),
      registered: false
    });
    chai.assert(device.registered === true, 'Settings should auto-register device');
  });
});
