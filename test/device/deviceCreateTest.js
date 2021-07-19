const request = require('supertest')
  , sinon = require('sinon')
  , chai = require('chai')
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , TokenModel = mongoose.model('Token')
  , SecurePropertyAppender = require('../../security/utilities/secure-property-appender');

require('sinon-mongoose');

const expect = chai.expect;
const should = chai.should();

const DeviceOperations = require('../../models/device');
const DeviceModel = mongoose.model('Device');

const UserOperations = require('../../models/user');
const UserModel = UserOperations.Model;

const Authentication = require('../../models/authentication');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("device create tests", function () {

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

  afterEach(function () {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate')
      .chain('exec')
      .yields(null, createToken(userId, [permission]));
  }

  it("allows an admin to create a registered device", async function () {
    mockTokenWithPermission('CREATE_DEVICE');

    sinon.mock(UserOperations)
      .expects('getUserById').withArgs(userId.toHexString())
      .resolves(new UserModel({
        _id: userId,
        authenticationId: mongoose.Types.ObjectId()
      }));

    const reqDevice = {
      uid: '12345',
      description: 'Some description',
      userId: userId.toHexString()
    };

    const registeredDevice = new DeviceModel({
      ...reqDevice,
      _id: mongoose.Types.ObjectId(),
      registered: true
    })

    const mockDeviceModel = sinon.mock(DeviceModel);
    mockDeviceModel
      .expects('findOneAndUpdate').withArgs({ uid: reqDevice.uid }, sinon.match.hasNested('registered', true))
      .resolves(registeredDevice);

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

    const user = new UserModel({
      _id: userId,
      username: 'unregisteredDeviceTest',
      displayName: 'Unregistered Device Test',
      roleId: mongoose.Types.ObjectId(),
      active: true,
      authenticationId: new Authentication.Local({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {}
        })
      })
    });

    const reqDevice = {
      uid: '12345',
      description: 'Some description',
      appVersion: 'Some Version',
      userId: userId.toHexString()
    };

    const device = new DeviceModel({
      _id: mongoose.Types.ObjectId(),
      ...reqDevice
    });

    sinon.mock(AuthenticationConfiguration.Model)
      .expects('findOne')
      .chain('exec')
      .resolves(user.authentication.authenticationConfiguration);

    sinon.mock(user.authentication)
      .expects('validatePassword').withArgs('test')
      .yields(null, true);

    const mockUserOps = sinon.mock(UserOperations);
    mockUserOps
      .expects('getUserByUsername').withArgs(user.username)
      .yields(null, user);
    mockUserOps
      .expects('validLogin').withArgs(user)
      .resolves(user);

    const mockDeviceOps = sinon.mock(DeviceOperations);
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

    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      roleId: mongoose.Types.ObjectId(),
      authenticationId: new Authentication.Local({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {}
        })
      })
    });

    sinon.mock(mockUser.authentication)
      .expects('validatePassword')
      .yields(null, true);

    sinon.mock(AuthenticationConfiguration.Model)
      .expects('findOne')
      .chain('exec')
      .resolves(mockUser.authentication.authenticationConfiguration);

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', { path: 'authenticationId', populate: { path: 'authenticationConfigurationId' } })
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

    sinon.mock(DeviceModel)
      .expects('findOne')
      .withArgs({
        uid: '12345'
      })
      .chain('exec')
      .resolves({
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
        userId: mockUser.id
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const device = res.body;
        should.exist(device);
        device.should.have.property('uid').that.equals('12345');
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
        console.log('res', res.text);
        // res.text.should.equal("missing required param 'uid'");
      })
      .end(done);
  });

  it('saves unregistered device', async function () {
    const unregisteredDevice = new DeviceModel({
      uid: 'test',
      description: 'Some description',
      userId: userId.toHexString(),
      registered: false
    });

    sinon.mock(UserOperations)
      .expects('getUserById')
      .withArgs(userId.toHexString())
      .resolves(new UserModel({
        _id: userId,
        authentication: {
          type: 'local'
        }
      }));

    const mockDeviceModel = sinon.mock(DeviceModel);
    mockDeviceModel
      .expects('findOneAndUpdate')
      .withArgs({ uid: unregisteredDevice.uid }, sinon.match.hasNested('registered', false))
      .resolves(unregisteredDevice);

    const device = await DeviceOperations.createDevice(unregisteredDevice);
    chai.assert(device.registered === false, 'Settings should auto-register device');
  });

  it('saves registered device', async function () {
    const registeredDevice = new DeviceModel({
      uid: 'test',
      description: 'Some description',
      userId: userId.toHexString(),
      registered: true
    });

    sinon.mock(UserOperations)
      .expects('getUserById')
      .withArgs(userId.toHexString())
      .resolves(new UserModel({
        _id: userId,
        authentication: {
          type: 'local'
        }
      }));

    const mockDeviceModel = sinon.mock(DeviceModel);
    mockDeviceModel
      .expects('findOneAndUpdate')
      // .withArgs({ uid: registeredDevice.uid }, sinon.match.hasNested('registered', true))
      .resolves(registeredDevice);

    const device = await DeviceOperations.createDevice(new DeviceModel({
      uid: 'test',
      description: 'Some description',
      userId: userId.toHexString(),
      registered: false
    }));
    chai.assert(device.registered === true, 'Settings should auto-register device');
  });
});
