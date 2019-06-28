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
var ObservationIdModel = mongoose.model('ObservationId');

describe("observation create tests", function() {

  beforeEach(function() {
    var mockEvent = EventModel({
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

    });

    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);
  });

  afterEach(function() {
    sinon.restore();
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should create an observation id", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var mockObservation = new ObservationIdModel({_id: mongoose.Types.ObjectId()});
    sinon.mock(ObservationIdModel)
      .expects('create')
      .withArgs({})
      .yields(null, mockObservation);

    request(app)
      .post('/api/events/1/observations/id')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send()
      .expect(201)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        should.exist(res.body);
        res.body.should.have.property('id');
      })
      .end(done);
  });

  it("should create an observation for an event", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var observationId = mongoose.Types.ObjectId();
    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, {_id: observationId});

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: '2016-01-01T00:00:00'
      }
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    sinon.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .withArgs(observationId.toString(), sinon.match.any, {new: true, upsert: true})
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
          type: 'test',
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var observation = res.body;
        should.exist(observation);
        res.body.should.have.property('id');
        res.body.should.have.property('url');
      })
      .end(done);
  });

  it("should reject new observation with invalid id", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    var observationId = mongoose.Types.ObjectId();
    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, null);

    var ObservationModel = observationModel({
      _id: observationId,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

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
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(404)
      .end(done);
  });

  it("should reject new observation for invalid permission", function(done) {
    mockTokenWithPermission('UPDATE_OBSERVATION');

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
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
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(403)
      .expect(function(res) {
        res.text.should.equal("Forbidden");
      })
      .end(done);
  });

  it("should reject new observation w/o geometry", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, {_id: 1});

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        properties: {
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("'geometry' param required but not specified");
      })
      .end(done);
  });

  it("should reject new observation with invalid geometry", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, {_id: 1});

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-181, 0]
        },
        properties: {
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("Cannot create observation, 'geometry' is not valid.");
      })
      .end(done);
  });

  it("should reject new observation w/o properties", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, {_id: 1});

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        }
      })
      .expect(400)
      .end(done);
  });

  it("should reject new observation w/o timestamp", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, {_id: 1});

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
        }
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("'properties.timestamp' param required but not specified");
      })
      .end(done);
  });

  it("should reject new observation with invalid timestamp", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, {_id: 1});

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          timestamp: 'not a timestamp'
        }
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("cannot create observation, 'timestamp' property is not a valid ISO8601 date");
      })
      .end(done);
  });

  it("should reject new observation for event you are not part of", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, []);

    request(app)
      .post('/api/events/1/observations/id')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(403)
      .expect(function(res) {
        res.text.should.equal("Cannot submit an observation for an event that you are not part of.");
      })
      .end(done);
  });
});
