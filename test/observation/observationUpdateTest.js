var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;

describe("observation update tests", function() {

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

  it("should update observation for id", function(done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

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
      }
    });
    sandbox.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .yields(null, mockObservation);

    request(app)
      .put('/api/events/1/observations/' + observationId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          type: 'type',
          timestamp: Date.now()
        }
      })
      .expect(200)
      .expect(function(res) {
        var observation = res.body;
        should.exist(observation);
        observation.should.have.property('id');
        observation.should.have.property('url');
      })
      .end(done);
  });

  it("should deny update observation for id w/o type", function(done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

    sandbox.mock(EventModel)
      .expects('populate')
      .yields(null, {
        name: 'Event 1',
        teamIds: [{
          name: 'Team 1',
          userIds: [userId]
        }]
      });

    request(app)
      .put('/api/events/1/observations/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          timestamp: Date.now()
        }
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("cannot update observation 'properties.type' param not specified");
      })
      .end(done);
  });

  it("should deny update observation for id w/o timestamp", function(done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

    sandbox.mock(EventModel)
      .expects('populate')
      .yields(null, {
        name: 'Event 1',
        teamIds: [{
          name: 'Team 1',
          userIds: [userId]
        }]
      });

    request(app)
      .put('/api/events/1/observations/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          type: 'type'
        }
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("cannot update observation 'properties.timestamp' param not specified");
      })
      .end(done);
  });

  it("should deny update observation for id that does not exist", function(done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

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

    sandbox.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          type: 'type',
          timestamp: Date.now()
        }
      })
      .expect(404)
      .expect(function(res) {
        res.text.should.equal('Observation with id 123 does not exist');
      })
      .end(done);
  });

  it("should deny update observation for event I am not part of", function(done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sandbox.mock(EventModel)
      .expects('populate')
      .yields(null, {
        name: 'Event 1',
        teamIds: [{
          name: 'Team 1',
          userIds: [mongoose.Types.ObjectId()]
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
      }
    });
    sandbox.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .yields(null, mockObservation);

    request(app)
      .put('/api/events/1/observations/' + observationId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          type: 'type',
          timestamp: Date.now()
        }
      })
      .expect(403)
      .expect(function(res) {
        res.text.should.equal('Forbidden');
      })
      .end(done);
  });
});
