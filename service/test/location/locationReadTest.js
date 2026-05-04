'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , moment = require('moment')
  , should = require('chai').should()
  , createToken = require('../mockToken')
  , CappedLocationModel = require('../../lib/models/cappedLocation')
  , EventModel = require('../../lib/models/event')
  , TeamModel = require('../../lib/models/team')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration')
  , { defaultEventPermissionsService: eventPermissions } = require('../../lib/permissions/permissions.events');

require('sinon-mongoose');

require('../../lib/models/location');
const LocationModel = mongoose.model('Location');

describe("location read tests", function () {

  let app;
  let mockEvent;
  let userId;

  beforeEach(function () {
    mockEvent = {
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      teams: [{
        name: 'Team 1'
      }],
      acl: {}
    };

    sinon.mock(EventModel)
      .expects('getById')
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

    userId = mongoose.Types.ObjectId();
    app = require('../../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
  });

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission]));
  }

  it("should get locations with read all permission", function (done) {
    mockTokenWithPermission('READ_LOCATION_ALL');

    sinon.mock(TeamModel)
      .expects('teamsForUserInEvent')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(LocationModel)
      .expects('find')
      .yields(null, [{
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        },
        "properties": {
          "timestamp": Date.now(),
          "accuracy": 39
        }
      }]);

    request(app)
      .get('/api/events/1/locations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        const locations = res.body;
        should.exist(locations);
        locations.should.be.an('array');
        locations.should.have.length(1);
      })
      .end(done);
  });

  it("should get locations with event read permission", function (done) {
    mockTokenWithPermission('READ_LOCATION_EVENT');

    sinon.mock(eventPermissions)
      .expects('userHasEventPermission')
      .withArgs(mockEvent, userId.toHexString(), 'read')
      .resolves(true)

    sinon.mock(LocationModel)
      .expects('find')
      .yields(null, [{
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        },
        "properties": {
          "timestamp": Date.now(),
          "accuracy": 39
        }
      }]);

    request(app)
      .get('/api/events/1/locations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        const locations = res.body;
        should.exist(locations);
        locations.should.be.an('array');
        locations.should.have.length(1);
      })
      .end(done);
  });

  it("should get locations grouped by user", function (done) {
    mockTokenWithPermission('READ_LOCATION_EVENT');

    sinon.mock(eventPermissions)
      .expects('userHasEventPermission')
      .withArgs(mockEvent, userId.toHexString(), 'read')
      .resolves(true)

    sinon.mock(CappedLocationModel)
      .expects('getLocations')
      .yields(null, [{
        userId: mongoose.Types.ObjectId(),
        locations: [{
          type: "Feature",
          userId: mongoose.Types.ObjectId(),
          properties: {
            timestamp: "2016-02-02T14:42:13.811Z",
            accuracy: 39,
            deviceId: "56a8d5b81db0452f4d7ec6a0"
          },
          eventId: 1,
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          },
          teamIds: ["56a8eabc1205e577246e3f36"]
        }]
      }]);

    request(app)
      .get('/api/events/1/locations/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        const users = res.body;
        should.exist(users);
        users.should.be.an('array').and.have.length(1);
        const user = users[0];
        user.should.have.property('locations');
      })
      .end(done);
  });

  it("should filter locations on startDate/endDate with event read permission", function (done) {
    mockTokenWithPermission('READ_LOCATION_EVENT');

    sinon.mock(eventPermissions)
      .expects('userHasEventPermission')
      .withArgs(mockEvent, userId.toHexString(), 'read')
      .resolves(true)

    const startDate = moment("2016-01-01T00:00:00");
    const endDate = moment("2016-02-01T00:00:00");
    sinon.mock(LocationModel)
      .expects('find')
      .withArgs({
        eventId: 1,
        'properties.timestamp': {
          $gte: startDate.toDate(),
          $lt: endDate.toDate()
        }
      })
      .yields(null, [{
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        },
        "properties": {
          "timestamp": Date.now(),
          "accuracy": 39
        }
      }]);

    request(app)
      .get('/api/events/1/locations')
      .query({ startDate: startDate.toISOString(), endDate: endDate.toISOString() })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        const locations = res.body;
        should.exist(locations);
        locations.should.be.an('array');
        locations.should.have.length(1);
      })
      .end(done);
  });

  it("should page locations with event read permission", function (done) {
    mockTokenWithPermission('READ_LOCATION_EVENT');

    sinon.mock(eventPermissions)
      .expects('userHasEventPermission')
      .withArgs(mockEvent, userId.toHexString(), 'read')
      .resolves(true)

    const startDate = moment("2016-01-01T00:00:00");
    const endDate = moment("2016-02-01T00:00:00");
    const lastLocationId = mongoose.Types.ObjectId();
    sinon.mock(LocationModel)
      .expects('find')
      .withArgs({
        $or: [{
          _id: { $gt: lastLocationId.toString() },
          'properties.timestamp': startDate.toDate()
        }, {
          'properties.timestamp': {
            $gt: startDate.toDate()
          }
        }],
        eventId: 1,
        'properties.timestamp': {
          $lt: endDate.toDate()
        }
      })
      .yields(null, [{
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        },
        "properties": {
          "timestamp": Date.now(),
          "accuracy": 39
        }
      }]);

    request(app)
      .get('/api/events/1/locations')
      .query({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        lastLocationId: lastLocationId.toString()
      })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        const locations = res.body;
        should.exist(locations);
        locations.should.be.an('array');
        locations.should.have.length(1);
      })
      .end(done);
  });

  it("should limit locations with event read permission", function (done) {
    mockTokenWithPermission('READ_LOCATION_EVENT');

    sinon.mock(eventPermissions)
      .expects('userHasEventPermission')
      .withArgs(mockEvent, userId.toHexString(), 'read')
      .resolves(true)

    sinon.mock(LocationModel)
      .expects('find')
      .withArgs(sinon.match.any, sinon.match.any, sinon.match.any)
      .yields(null, [{
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        },
        "properties": {
          "timestamp": Date.now(),
          "accuracy": 39
        }
      }]);

    request(app)
      .get('/api/events/1/locations')
      .query({ limit: 10 })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        const locations = res.body;
        should.exist(locations);
        locations.should.be.an('array');
        locations.should.have.length(1);
      })
      .end(done);
  });

  it("should deny locations with read event permission when not in event", function (done) {
    mockTokenWithPermission('READ_LOCATION_EVENT');

    sinon.mock(eventPermissions)
      .expects('userHasEventPermission')
      .withArgs(mockEvent, userId.toHexString(), 'read')
      .resolves(false)

    sinon.mock(LocationModel)
      .expects('find')
      .yields(null, [{
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        },
        "properties": {
          "timestamp": Date.now(),
          "accuracy": 39
        }
      }]);

    request(app)
      .get('/api/events/1/locations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(403)
      .end(done);
  });
});
