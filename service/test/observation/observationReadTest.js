const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , moment = require('moment')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../lib/models/team');
const TeamModel = mongoose.model('Team');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

const Observation = require('../../lib/models/observation');
const observationModel = Observation.observationModel;

const SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');
const { defaultEventPermissionsService: eventPermissions } = require('../../lib/permissions/permissions.events');
const { EventAccessType } = require('../../lib/entities/events/entities.events');

describe("observation read tests", function () {

  let mockEvent;
  let userId;
  let app;

  beforeEach(function () {
    mockEvent = new EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      acl: {}
    });
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    userId = mongoose.Types.ObjectId()

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

    app = require('../../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
  });

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

  it("allows event participants to read observations", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_EVENT');

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
      .chain('exec')
      .yields(null, [mockObservation]);
    sinon.mock(eventPermissions)
      .expects('userHasEventPermission')
      .withArgs(mockEvent, userId.toHexString(), EventAccessType.Read)
      .resolves(true)

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

  it("denies observation read when requestor is not an event participant", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_EVENT');

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
      .yields(null, [mockObservation]);
    sinon.mock(eventPermissions)
      .expects('userHasEventPermission')
      .withArgs(mockEvent, userId.toHexString(), EventAccessType.Read)
      .resolves(false)

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
