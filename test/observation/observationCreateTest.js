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

describe("observation create tests", function() {

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
          required: true
        }]
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

  it("should create an observation for an event", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var mockObservation = new ObservationModel({
      _id: mongoose.Types.ObjectId(),
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: '2016-01-01T00:00:00'
      }
    });
    sandbox.mock(ObservationModel)
      .expects('create')
      .yields(null, mockObservation);

    request(app)
      .post('/api/events/1/observations')
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

  it("should reject new observation for invalid permission", function(done) {
    mockTokenWithPermission('READ_OBSERVATION');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, []);

    request(app)
      .post('/api/events/1/observations')
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

  it("should reject new observation w/o type", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    request(app)
      .post('/api/events/1/observations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("cannot create observation 'type' param not specified, or is not set to 'Feature'");
      })
      .end(done);
  });

  it("should reject new observation w/o geometry", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    request(app)
      .post('/api/events/1/observations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        properties: {
          type: 'type',
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("cannot create observation 'geometry' param not specified");
      })
      .end(done);
  });

  it("should reject new observation w/o properties", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    request(app)
      .post('/api/events/1/observations')
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

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    request(app)
      .post('/api/events/1/observations')
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
        res.text.should.equal("cannot create observation 'properties.timestamp' param not specified");
      })
      .end(done);
  });

  it("should reject new observation with invalid timestamp", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    request(app)
      .post('/api/events/1/observations')
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
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("cannot create observation, 'timestamp' property is not a valid ISO8601 date");
      })
      .end(done);
  });


  it("should reject new observation w/o type", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    request(app)
      .post('/api/events/1/observations')
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
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("cannot create observation 'properties.type' param not specified");
      })
      .end(done);
  });

  it("should reject new observation for event you are not part of", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, []);

    request(app)
      .post('/api/events/1/observations')
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
        res.text.should.equal("Cannot submit an observation for an event that you are not part of.");
      })
      .end(done);
  });
});
