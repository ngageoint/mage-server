var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;

describe("observation favorite tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function() {
    var mockEvent = {
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      form: {
        fields: [{
          type: "date",
          name: "timestamp",
          title: "Date",
          required: true
        },{
          type: "geometry",
          name: "geometry",
          title: "Location",
          required: true
        },{
          type: "dropdown",
          name: "type",
          title: "type",
          choices: [{
            id: 1,
            value: 1,
            title: 'test'
          }],
          required: true
        }],
        userFields: []
      }
    };
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

  it("should favorite observation", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

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
        timestamp: '2016-01-01T00:00:00'
      },
      favoriteUserIds: [userId]
    });

    var observationMock = sandbox.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .withArgs(observationId.toString(), sinon.match( { '$addToSet': {favoriteUserIds: userId} } ), sinon.match.any)
      .yields(null, mockObservation);

    request(app)
      .put('/api/events/1/observations/' + observationId + '/favorite')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          type: 'test',
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        observationMock.verify();
        var observation = res.body;
        should.exist(observation);
        var favoriteUserIds = observation.favoriteUserIds;
        should.exist(favoriteUserIds);
        favoriteUserIds.should.be.a('array');
        favoriteUserIds.should.contain(userId.toString());
      })
      .end(done);
  });

  it("should unfavorite observation", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

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
        timestamp: '2016-01-01T00:00:00'
      },
      favoriteUserIds: []
    });

    var observationMock = sandbox.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .withArgs(observationId.toString(), sinon.match( { '$pull': {favoriteUserIds: userId} } ), sinon.match.any)
      .yields(null, mockObservation);

    request(app)
      .delete('/api/events/1/observations/' + observationId + '/favorite')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        observationMock.verify();
        var observation = res.body;
        should.exist(observation);
        var favoriteUserIds = observation.favoriteUserIds;
        should.exist(favoriteUserIds);
        favoriteUserIds.should.be.empty;
      })
      .end(done);
  });
});
