const request = require('supertest')
  , sinon = require('sinon')
  , chai = require('chai')
  , mongoose = require('mongoose')
  , app = require('../../express')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token')
  , Setting = require('../../models/setting');

require('sinon-mongoose');

const expect = chai.expect;
const should = chai.should();

require('../../models/device');
const DeviceModel = mongoose.model('Device');

const UserOperations = require('../../models/user');
const UserModel = UserOperations.Model;

describe("device create tests", function() {

  afterEach(function() {
    sinon.restore();
  });

  var userId = mongoose.Types.ObjectId();

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should create registered device", async function() {
    mockTokenWithPermission('CREATE_DEVICE');

    const userId = mongoose.Types.ObjectId();

    sinon.mock(UserOperations)
      .expects('getUserById')
      .withArgs(userId.toHexString())
      .resolves(new UserModel({
        _id: userId,
        authentication: {
          type: 'local'
        }
      }));

    sinon.mock(DeviceModel)
      .expects('findOneAndUpdate')
      .withArgs({
        uid: '12345'
      },{
        description: "Some description",
        name: "Test Device",
        registered: true,
        userId: userId.toString(),
        appVersion: undefined,
        userAgent: undefined
      })
      .chain('exec')
      .resolves({
        uid: '12345',
        name: 'Test Device',
        description: 'Some description',
        userId: userId.toString()
      });

    const res = await request(app)
      .post('/api/devices')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        uid: '12345',
        name: 'Test Device',
        description: 'Some description',
        userId: userId.toString()
      })

    expect(res.status).to.equal(200)
    expect(res.type).to.match(/json/)
    expect(res.body).to.exist
  });

  it("should create unregistered device", function(done) {
    mockTokenWithPermission('NO_PERMISSION');

    var userId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      roleId: mongoose.Types.ObjectId(),
      active: true,
      authentication: {
        type: this.test.title
      }
    });

    sinon.mock(mockUser)
      .expects('validPassword')
      .yields(null, true);

    sinon.mock(UserOperations)
      .expects('getUserById').withArgs(userId.toHexString())
      .resolves(mockUser);

    sinon.mock(Setting)
      .expects('getSetting').withArgs('security')
      .resolves({
        settings: {
          [mockUser.authentication.type]: {
            devicesReqAdmin: true
          }
        }
      });

    sinon.mock(DeviceModel)
      .expects('findOne')
      .withArgs({
        uid: '12345'
      })
      .chain('exec')
      .resolves(null);

    sinon.mock(DeviceModel)
      .expects('findOneAndUpdate')
      .withArgs({
        uid: '12345'
      },{
        description: "Some description",
        name: "Test Device",
        userId: userId.toString(),
        appVersion: 'Some Version',
        userAgent: sinon.match.typeOf('string')
      })
      .chain('exec')
      .resolves({
        uid: '12345',
        name: 'Test Device',
        description: 'Some description',
        userId: userId.toString()
      });

    sinon.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

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
        appVersion: 'Some Version',
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
        userId: userId.toString()
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

});
