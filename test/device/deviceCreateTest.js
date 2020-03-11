const request = require('supertest')
  , sinon = require('sinon')
  , chai = require('chai')
  , mongoose = require('mongoose')
  , app = require('../../express')
  , createToken = require('../mockToken')
  , TokenModel = mongoose.model('Token')
  , Setting = require('../../models/setting');

require('sinon-mongoose');

const expect = chai.expect;
const should = chai.should();

const DeviceOperations = require('../../models/device');
const DeviceModel = mongoose.model('Device');

const UserOperations = require('../../models/user');
const UserModel = UserOperations.Model;

describe("device create tests", function() {

  afterEach(function() {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate')
      .chain('exec')
      .yields(null, createToken(userId, [permission]));
  }

  it("allows an admin to create a registered device", async function() {
    mockTokenWithPermission('CREATE_DEVICE');

    sinon.mock(UserOperations)
      .expects('getUserById').withArgs(userId.toHexString())
      .resolves(new UserModel({
        _id: userId,
        authentication: {
          type: 'local'
        }
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

  it("DEPRECATED: creates an unregistered device with local auth", async function() {
    mockTokenWithPermission('NO_PERMISSION');

    const user = new UserModel({
      _id: userId,
      username: 'unregisteredDeviceTest',
      displayName: 'Unregistered Device Test',
      roleId: mongoose.Types.ObjectId(),
      active: true,
      authentication: {
        type: 'local'
      },
      security: {}
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

    sinon.mock(user)
      .expects('validPassword').withArgs('test')
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

  it("should skip create unregistered device if exists", function(done) {
    mockTokenWithPermission('NO_PERMISSION');

    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      roleId: mongoose.Types.ObjectId(),
      authentication: {
        type: this.test.title
      }
    });

    sinon.mock(mockUser)
      .expects('validPassword')
      .yields(null, true);

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({username: 'test'})
      .chain('populate')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

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
        console.log('res', res.text);
        // res.text.should.equal("missing required param 'uid'");
      })
      .end(done);
  });

  describe('auto-registration', function() {

    afterEach(function() {
      sinon.restore();
    });

    const userId = mongoose.Types.ObjectId();

    sinon.mock(UserOperations)
      .expects('getUserById').withArgs(userId.toHexString())
      .resolves(new UserModel({
        _id: userId,
        authentication: {
          type: 'local'
        }
      }));

    const reqDevice = {
      uid: '12345',
      description: 'Some description',
      userId: userId.toHexString()
    };

    const unregisteredDevice = new DeviceModel({
      ...reqDevice,
      _id: mongoose.Types.ObjectId(),
      registered: false
    })

    const mockDeviceModel = sinon.mock(DeviceModel);
    mockDeviceModel
      .expects('findOneAndUpdate').withArgs({ uid: reqDevice.uid }, sinon.match.hasNested('registered', false))
      .resolves(unregisteredDevice);

    sinon.mock(DeviceOperations).expects('createDevice').resolves(mockDeviceModel);

    it('auto-registers a device if the security settings allow', async function() {
      sinon.mock(Setting)
      .expects('getSetting').withArgs('security')
      .resolves({
        _id: mongoose.Types.ObjectId(),
        type: 'security',
        settings: { 
          local: { usersReqAdmin: { enabled: true }, devicesReqAdmin: { enabled: false } } }
      });

      DeviceOperations.createDevice(mockDeviceModel)
            .then(device => {chai.assert(device.registered == true, 'Settings should auto-register device');})
            .catch(err => {chai.assert(false, 'Error creating device');});
    });

    it('does not auto-register a device if the security settings do not allow', async function() {
      sinon.mock(Setting)
      .expects('getSetting').withArgs('security')
      .resolves({
        _id: mongoose.Types.ObjectId(),
        type: 'security',
        settings: { 
          local: { usersReqAdmin: { enabled: true }, devicesReqAdmin: { enabled: true } } }
      });

      DeviceOperations.createDevice(mockDeviceModel)
            .then(device => {chai.assert(device.registered == false, 'Settings should NOT auto-register device');})
            .catch(err => {chai.assert(false, 'Error creating device');});
    });

    it('does not auto-register a device if the security settings do not exist', async function() {
      sinon.mock(Setting)
      .expects('getSetting').withArgs('security')
      .resolves({
        _id: mongoose.Types.ObjectId(),
        type: 'security',
        settings: {  }
      });

      DeviceOperations.createDevice(mockDeviceModel)
            .then(device => {chai.assert(device.registered == false, 'Settings do not exist, and should NOT auto-register device');})
            .catch(err => {chai.assert(false, 'Error creating device');});
    });
  });
});
