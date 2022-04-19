var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , moment = require('moment')
  , MockToken = require('../mockToken')
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

describe("observation read tests", function () {

  let app;

  beforeEach(function () {
    var mockEvent = new EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      acl: {}
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

  it("should get observations for any event", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    sinon.mock(TeamModel)
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
        timestamp: Date.now()
      }
    });
    sinon.mock(ObservationModel)
      .expects('find')
      .chain('exec')
      .yields(null, [mockObservation]);

    request(app)
      .get('/api/events/1/observations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        var observations = res.body;
        should.exist(observations);
        observations.should.be.an('array');
        observations.should.have.length(1);
      })
      .end(done);
  });


  it("should get observations for any event and populate user", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    const ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    const mockObservation = new ObservationModel({
      _id: mongoose.Types.ObjectId(),
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      }
    });
    sinon.mock(ObservationModel)
      .expects('find')
      .chain('populate').withArgs({
        path: 'userId',
        select: 'displayName'
      })
      .chain('populate').withArgs({
        path: 'important.userId',
        select: 'displayName'
      })
      .chain('exec')
      .yields(null, [mockObservation]);

    request(app)
      .get('/api/events/1/observations?populate=true')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        const observations = res.body;
        should.exist(observations);
        observations.should.be.an('array');
        observations.should.have.length(1);
      })
      .end(done);
  });

  it("tolerates a reference to a user that no longer exists", async function () {

    mockTokenWithPermission('READ_OBSERVATION_ALL');

    const ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    const obs = new ObservationModel({
      _id: mongoose.Types.ObjectId(),
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      },
      userId: null,
      important: {
        userId: null
      }
    });
    sinon.stub(obs, 'populated').callsFake(() => mongoose.Types.ObjectId())
    sinon.mock(ObservationModel)
      .expects('find')
      .chain('populate').withArgs({
        path: 'userId',
        select: 'displayName'
      })
      .chain('populate').withArgs({
        path: 'important.userId',
        select: 'displayName'
      })
      .chain('exec')
      .yields(null, [obs]);

    const res = await request(app)
      .get('/api/events/1/observations?populate=true')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')

    res.status.should.equal(200);
    const observations = res.body;
    observations.should.be.an('array');
    observations.should.have.length(1);
    console.log(observations[0])
    observations[0].should.have.property('user', null);
    observations[0].should.deep.include({ important: { user: null } })
  });

  it("should get observations for event I am a part of", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_EVENT');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(EventModel)
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
    var mockObservation = new ObservationModel({
      _id: mongoose.Types.ObjectId(),
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      }
    });
    sinon.mock(ObservationModel)
      .expects('find')
      .chain('exec')
      .yields(null, [mockObservation]);

    request(app)
      .get('/api/events/1/observations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        var observations = res.body;
        should.exist(observations);
        observations.should.be.an('array');
        observations.should.have.length(1);
      })
      .end(done);
  });

  it("should get observations and filter on start and end date", function (done) {
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
      }
    });

    var startDate = moment("2016-01-01T00:00:00");
    var endDate = moment("2016-02-01T00:00:00");
    sinon.mock(ObservationModel)
      .expects('find')
      .withArgs({
        lastModified: {
          $gte: startDate.toDate(),
          $lt: endDate.toDate()
        }
      })
      .chain('exec')
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({ startDate: startDate.toISOString(), endDate: endDate.toISOString() })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  it("should get observations and filter on observationStartDate and observationEndDate", function (done) {
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
      }
    });

    var startDate = moment("2016-01-01T00:00:00");
    var endDate = moment("2016-02-01T00:00:00");
    sinon.mock(ObservationModel)
      .expects('find')
      .withArgs({
        "properties.timestamp": {
          $gte: startDate.toDate(),
          $lt: endDate.toDate()
        }
      })
      .chain('exec')
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({ observationStartDate: startDate.toISOString(), observationEndDate: endDate.toISOString() })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  it("should get observations and filter on bbox", function (done) {
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
      }
    });

    var bbox = [0, 0, 10, 10];
    sinon.mock(ObservationModel)
      .expects('find')
      .withArgs({
        geometry: {
          $geoIntersects: {
            $geometry: {
              coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
              type: "Polygon"
            }
          }
        }
      })
      .chain('exec')
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({ bbox: JSON.stringify(bbox) })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  it("should get observations and filter on geometry", function (done) {
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
      }
    });

    var geometry = {
      type: "Polygon",
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
    };
    sinon.mock(ObservationModel)
      .expects('find')
      .withArgs({
        geometry: {
          $geoIntersects: {
            $geometry: {
              coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
              type: "Polygon"
            }
          }
        }
      })
      .chain('exec')
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({ geometry: JSON.stringify(geometry) })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  it("should get observations and filter on states", function (done) {
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
      }
    });

    var states = 'active,archive';
    sinon.mock(ObservationModel)
      .expects('find')
      .withArgs({
        "states.0.name": { $in: ['active', 'archive'] }
      })
      .chain('exec')
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({ states: states })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  it("should get observations and sort on lastModified", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

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

    var sort = 'lastModified';
    sinon.mock(ObservationModel)
      .expects('find')
      .withArgs(sinon.match.any, sinon.match.any, { sort: { lastModified: 1 } })
      .chain('exec')
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({ sort: sort })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  it("should get observations and sort on DESC lastModified", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

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

    var sort = 'lastModified+DESC';
    sinon.mock(ObservationModel)
      .expects('find')
      .withArgs(sinon.match.any, sinon.match.any, { sort: { lastModified: -1 } })
      .chain('exec')
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({ sort: sort })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  it("should deny observations with invalid sort parameter", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    request(app)
      .get('/api/events/1/observations')
      .query({ sort: 'properties' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(400)
      .expect(function (res) {
        res.text.should.equal("Cannot sort on column 'properties'");
      })
      .end(done);
  });

  it("should deny observations for event I am not part of", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_EVENT');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(EventModel)
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
    var mockObservation = new ObservationModel({
      _id: mongoose.Types.ObjectId(),
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      }
    });
    sinon.mock(ObservationModel)
      .expects('find')
      .yields(null, [mockObservation]);

    request(app)
      .get('/api/events/1/observations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(403)
      .expect(function (res) {
        res.text.should.equal('Forbidden');
      })
      .end(done);
  });

  it("should get observation for any event by id", function (done) {
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
      states: [{
        name: 'active'
      }]
    });
    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  it("should fail to get observation by id that does not exist", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .get('/api/events/1/observations/123')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(404)
      .end(done);
  });

  it("should get observation and filter fields for any event by id", function (done) {
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
      }
    });
    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs('123', { geometry: 1, id: true, "properties.timestamp": 1, type: true })
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations/123')
      .query({ fields: JSON.stringify({ "geometry": 1, "properties": { "timestamp": 1 } }) })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });
});
