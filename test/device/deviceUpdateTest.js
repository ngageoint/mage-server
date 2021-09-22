const request = require('supertest')
  , sinon = require('sinon')
  , chai = require('chai')
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken');

const expect = chai.expect;
const should = chai.should();

require('sinon-mongoose');

require('../../models/device');
const DeviceModel = mongoose.model('Device');
const TokenModel = mongoose.model('Token');
const UserModel = mongoose.model('User');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("device update tests", function() {

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
      .yields(null, MockToken(userId, [permission]));
  }

  it("should update device", function(done) {
    mockTokenWithPermission('UPDATE_DEVICE');

    const userId = mongoose.Types.ObjectId();
    sinon.mock(DeviceModel)
      .expects('findByIdAndUpdate')
      .chain('exec')
      .resolves({
        uid: '12345',
        name: 'Test Device',
        registered: true,
        description: 'Some description',
        userId: userId.toString()
      });

    request(app)
      .put('/api/devices/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        uid: '12345',
        name: 'Test Device',
        registered: true,
        description: 'Some description',
        userId: userId.toString()
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var device = res.body;
        should.exist(device);
      })
      .end(done);
  });

  it("should update empty device", function(done) {
    mockTokenWithPermission('UPDATE_DEVICE');

    const userId = mongoose.Types.ObjectId();
    sinon.mock(DeviceModel)
      .expects('findByIdAndUpdate')
      .withArgs('123', {})
      .chain('exec')
      .resolves({
        uid: '12345',
        name: 'Test Device',
        registered: true,
        description: 'Some description',
        userId: userId.toString()
      });

    request(app)
      .put('/api/devices/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({})
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var device = res.body;
        should.exist(device);
      })
      .end(done);
  });


  it("should remove token for unregistered device", async function() {

    /*
    TODO:
    this test and others have a lot of ugly deep mocking down to the mongodb
    driver level.  that level of mocking does not belong in tests of high-level
    apis and use cases.
    */

    mockTokenWithPermission('UPDATE_DEVICE');

    const userId = mongoose.Types.ObjectId();
    const deviceId = mongoose.Types.ObjectId();

    const reqDevice = {
      uid: '12345',
      registered: false,
      description: 'Some description',
      userId: userId.toHexString()
    };

    const mockTokenModel = sinon.mock(TokenModel);
    mockTokenModel
      .expects('remove').withArgs({ deviceId: deviceId.toHexString() })
      .yields(null, 1);

    sinon.mock(UserModel)
      .expects('findById').callsFake(function() {
        console.log(arguments)
      })
      .withArgs(userId)
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves({});

    sinon.mock(DeviceModel.collection)
      .expects('findAndModify')
      .yields(null, {
        value: {
          ...reqDevice,
          _id: deviceId.toHexString()
        }
      });

    const res = await request(app)
      .put('/api/devices/' + deviceId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send(reqDevice);

    expect(res.status).to.equal(200);
    expect(res.type).to.match(/json/);
    expect(res.body).to.include(reqDevice);
    mockTokenModel.verify();
  });
});
