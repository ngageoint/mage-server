var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , mockfs = require('mock-fs')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("attachment read tests", function () {

  let app;

  beforeEach(function () {
    var mockEvent = new EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

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
    mockfs.restore();
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should get attachment for any event", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    mockfs({
      '/var/lib/mage/attachments/mock/path/attachment.jpeg': Buffer.from([8, 6, 7, 5, 3, 0, 9])
    });

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var observationId = mongoose.Types.ObjectId();
    var attachmentId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      },
      attachments: [{
        _id: attachmentId,
        size: 7,
        contentType: 'image/jpeg',
        relativePath: 'mock/path/attachment.jpeg'
      }]
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sinon.mock(ObservationModel)
      .expects('findOne')
      .withArgs({ _id: observationId, 'attachments._id': attachmentId.toString() })
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations/' + observationId + '/attachments/' + attachmentId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', 'image/jpeg')
      .expect('Content-Length', "7")
      .end(function (err) {
        done(err);
      });
  });

  it("should fail to get attachment that does not exist", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var observationId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      },
      attachments: []
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sinon.mock(ObservationModel)
      .expects('findOne')
      .withArgs({ _id: observationId, 'attachments._id': '456' })
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations/' + observationId + '/attachments/456')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(404)
      .end(done);
  });

  it("should get attachment range", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    mockfs({
      '/var/lib/mage/attachments/mock/path/attachment.jpeg': Buffer.from([8, 6, 7, 5, 3, 0, 9])
    });

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var observationId = mongoose.Types.ObjectId();
    var attachmentId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      },
      attachments: [{
        _id: attachmentId,
        size: 7,
        contentType: 'image/jpeg',
        relativePath: 'mock/path/attachment.jpeg'
      }]
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sinon.mock(ObservationModel)
      .expects('findOne')
      .withArgs({ _id: observationId, 'attachments._id': attachmentId.toString() })
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations/' + observationId + '/attachments/' + attachmentId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .set('Range', 'bytes=0-4')
      .expect(206)
      .expect('Content-Type', 'image/jpeg')
      .expect('Content-Length', "5")
      .expect('Content-Range', 'bytes 0-4/7')
      .end(done);
  });
});
