var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , fs = require('fs-extra')
  , stream = require('stream')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;

describe("attachment read tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function() {
    var mockEvent = new EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);
  });

  afterEach(function() {
    sandbox.restore();
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should get attachments for event I am a part of", function(done) {
    mockTokenWithPermission('READ_OBSERVATION_EVENT');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sandbox.mock(EventModel)
      .expects('populate')
      .yields(null, {
        name: 'Event 1',
        teamIds: [{
          name: 'Team 1',
          userIds: [userId]
        }]
      });

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
      attachments: [{
        size: 200,
        contentType: 'image/jpeg',
        relativePath: 'some/relative/path'
      },{
        size: 4096,
        contentType: 'image/jpeg',
        relativePath: 'some/relative/path'
      }]
    });

    sandbox.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations/' + observationId + '/attachments')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function(res) {
        var attachments = res.body;
        should.exist(attachments);
        attachments.should.be.an('array');
        attachments.should.have.length(2);
      })
      .end(done);
  });

  it("should get attachment for any event", function(done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    sandbox.mock(TeamModel)
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
      attachments: [{
        size: 4096,
        contentType: 'image/jpeg',
        relativePath: 'some/relative/path'
      }]
    });

    sandbox.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sandbox.mock(ObservationModel)
      .expects('findOne')
      .withArgs({_id: observationId})
      .yields(null, mockObservation);

    var mockedStream = new stream.Readable();
    mockedStream._read = function noop() {
      this.push('mock');
      this.push(null);
    };

    sandbox.mock(fs)
      .expects('createReadStream')
      .returns(mockedStream);

    request(app)
      .get('/api/events/1/observations/' + observationId + '/attachments/456')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', 'image/jpeg')
      .expect('Content-Length', 4096)
      .end(done);
  });
});
