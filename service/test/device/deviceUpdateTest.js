'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , chai = require('chai')
  , expect = chai.expect
  , should = chai.should()
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , TokenModel = require('../../lib/models/token')
  , DeviceModel = require('../../lib/models/device')
  , UserModel = require('../../lib/models/user')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('sinon-mongoose');

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

    sinon.mock(UserModel)
      .expects('getUserById').withArgs(userId)
      .resolves({
        _id: userId,
        authenticationId: mongoose.Types.ObjectId()
      });
  });

  afterEach(function () {
    sinon.restore();
  });

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission]));
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

    sinon.mock(DeviceModel)
      .expects('updateDevice')
      .resolves(reqDevice);

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

    sinon.mock(DeviceModel)
      .expects('updateDevice')
      .resolves(reqDevice);

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

    sinon.mock(TokenModel)
      .expects('removeToken')
      .withArgs('12345')
      .yields(null, 1);

    sinon.mock(DeviceModel)
      .expects('updateDevice')
      .resolves(reqDevice);

    const res = await request(app)
      .put('/api/devices/' + deviceId.toHexString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send(reqDevice);

    expect(res.status).to.equal(200);
    expect(res.type).to.match(/json/);
    should.exist(res.body);
  });
});
