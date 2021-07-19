var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/device');
var DeviceModel = mongoose.model('Device');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("device read tests", function() {

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

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should get devices", function(done) {
    mockTokenWithPermission('READ_DEVICE');

    sinon.mock(DeviceModel)
      .expects('find')
      .chain('exec')
      .resolves([{
        uid: '123'
      },{
        uid: '456'
      }]);

    request(app)
      .get('/api/devices')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var devices = res.body;
        should.exist(devices);
      })
      .end(done);
  });

  it("should get devices and populate user", function(done) {
    mockTokenWithPermission('READ_DEVICE');

    var mockDevices = [{
      uid: '123'
    },{
      uid: '456'
    }];
    sinon.mock(DeviceModel)
      .expects('find')
      .chain('exec')
      .resolves(mockDevices);

    sinon.mock(DeviceModel)
      .expects('populate')
      .withArgs(mockDevices, 'userId')
      .yields(null, [{
        uid: '123',
        userId: {}
      },{
        uid: '456',
        userId: {}
      }]);

    request(app)
      .get('/api/devices')
      .query({expand: 'user'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var devices = res.body;
        should.exist(devices);
      })
      .end(done);
  });

  it("should get registered devices", function(done) {
    mockTokenWithPermission('READ_DEVICE');

    sinon.mock(DeviceModel)
      .expects('find')
      .withArgs({ registered: true })
      .chain('exec')
      .resolves([{
        uid: '123'
      },{
        uid: '456'
      }]);

    request(app)
      .get('/api/devices')
      .query({registered: 'true'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var devices = res.body;
        should.exist(devices);
      })
      .end(done);
  });

  it("should get unregistered devices", function(done) {
    mockTokenWithPermission('READ_DEVICE');

    sinon.mock(DeviceModel)
      .expects('find')
      .withArgs({ registered: false })
      .chain('exec')
      .resolves([{
        uid: '123'
      },{
        uid: '456'
      }]);

    request(app)
      .get('/api/devices')
      .query({registered: 'false'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var devices = res.body;
        should.exist(devices);
      })
      .end(done);
  });

  it("should get device by id", function(done) {
    mockTokenWithPermission('READ_DEVICE');

    sinon.mock(DeviceModel)
      .expects('findById')
      .chain('exec')
      .resolves({
        uid: '123'
      });

    request(app)
      .get('/api/devices/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .query({expand: 'user'})
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var device = res.body;
        should.exist(device);
        device.should.have.property('uid').that.equals('123');
      })
      .end(done);
  });

  it("should count devices", function(done) {
    mockTokenWithPermission('READ_DEVICE');

    sinon.mock(DeviceModel)
      .expects('count')
      .chain('exec')
      .resolves(2);

    request(app)
      .get('/api/devices/count')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var body = res.body;
        should.exist(body);
        body.should.have.property('count').that.equals(2);
      })
      .end(done);
  });

});
