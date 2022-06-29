'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , chai = require('chai')
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken');

const expect = chai.expect;
const should = chai.should();

require('sinon-mongoose');

const DeviceOperations = require('../../lib/models/device');
const DeviceModel = DeviceOperations.Model;

const TokenModel = mongoose.model('Token');
const UserOperations = require('../../lib/models/user');
const UserModel = UserOperations.Model;

const SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

describe("device update tests", function () {

  let app;
  const userId = mongoose.Types.ObjectId();

  beforeEach(function () {
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

    app = require('../../lib/express').app;

    sinon.mock(UserOperations)
      .expects('getUserById').withArgs(userId)
      .resolves(new UserModel({
        _id: userId,
        authenticationId: mongoose.Types.ObjectId()
      }));
  });

  afterEach(function () {
    sinon.restore();
  });

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should update device", function (done) {
    mockTokenWithPermission('UPDATE_DEVICE');

    const deviceId = mongoose.Types.ObjectId();
    const uid = mongoose.Types.ObjectId();

    const reqDevice = {
      _id: deviceId.toHexString(),
      uid: uid.toHexString(),
      name: 'Test Device',
      registered: true,
      description: 'Some description',
      userId: userId.toString()
    };

    const registeredDevice = new DeviceModel({
      ...reqDevice
    })

    const mockDeviceModel = sinon.mock(DeviceModel);
    mockDeviceModel
      .expects('findOneAndUpdate').withArgs({ _id: reqDevice._id })
      .chain('exec')
      .resolves(registeredDevice);

    request(app)
      .put('/api/devices/' + deviceId.toHexString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send(reqDevice)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const device = res.body;
        should.exist(device);
      })
      .end(done);
  });

  it("should update empty device", function (done) {
    mockTokenWithPermission('UPDATE_DEVICE');

    const deviceId = mongoose.Types.ObjectId();
    const uid = mongoose.Types.ObjectId();

    const reqDevice = {
      _id: deviceId.toHexString(),
      uid: uid.toHexString(),
      name: 'Test Device',
      registered: true,
      description: 'Some description',
      userId: userId.toString()
    };

    const registeredDevice = new DeviceModel({
      ...reqDevice
    })

    const mockDeviceModel = sinon.mock(DeviceModel);
    mockDeviceModel
      .expects('findOneAndUpdate').withArgs({ _id: reqDevice._id })
      .chain('exec')
      .resolves(registeredDevice);

    request(app)
      .put('/api/devices/' + deviceId.toHexString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({})
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const device = res.body;
        should.exist(device);
      })
      .end(done);
  });


  it("should remove token for unregistered device", async function () {

    /*
    TODO:
    this test and others have a lot of ugly deep mocking down to the mongodb
    driver level.  that level of mocking does not belong in tests of high-level
    apis and use cases.
    */

    mockTokenWithPermission('UPDATE_DEVICE');

    const deviceId = mongoose.Types.ObjectId();
    const uid = mongoose.Types.ObjectId();

    const reqDevice = {
      _id: deviceId.toHexString(),
      uid: uid.toHexString(),
      registered: false,
      description: 'Some description',
      userId: userId.toHexString()
    };

    const mockTokenModel = sinon.mock(TokenModel);
    mockTokenModel
      .expects('remove').withArgs({ deviceId: deviceId.toHexString() })
      .yields(null, 1);

    //This allows the middleware of mongoose to execute, thus removing the token
    sinon.mock(DeviceModel.collection)
      .expects('findAndModify')
      .yields(null, {
        value: {
          ...reqDevice,
          _id: deviceId.toHexString()
        }
      });

    const res = await request(app)
      .put('/api/devices/' + deviceId.toHexString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send(reqDevice);

    //TODO due to how we are mocking, the device is not returned from the model to the route.
    //expect(res.status).to.equal(200);
    //expect(res.type).to.match(/json/);
    //should.exist(res.body);
    mockTokenModel.verify();
  });
});
