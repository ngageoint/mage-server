var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

require('../../models/location');
var LocationModel = mongoose.model('Location');

require('../../models/cappedLocation');
var CappedLocationModel = mongoose.model('CappedLocation');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("location create tests", function () {

  let app;

  beforeEach(function () {
    var mockEvent = EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      teams: [{
        name: 'Team 1'
      }]


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

  it("should create locations for an event", function (done) {
    mockTokenWithPermission('CREATE_LOCATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var mockLocations = [{
      "eventId": 1,
      "geometry": {
        "type": "Point",
        "coordinates": [0, 0]
      },
      "properties": {
        "timestamp": Date.now(),
        "accuracy": 39
      }
    }, {
      "eventId": 1,
      "geometry": {
        "type": "Point",
        "coordinates": [10, 10]
      },
      "properties": {
        "timestamp": Date.now(),
        "accuracy": 10
      }
    }];
    sinon.mock(LocationModel)
      .expects('create')
      .yields(null, mockLocations);

    sinon.mock(CappedLocationModel)
      .expects('findOneAndUpdate')
      .yields(null, {});

    request(app)
      .post('/api/events/1/locations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send([{
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        },
        "properties": {
          "timestamp": Date.now(),
          "accuracy": 39
        }
      }, {
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [10, 10]
        },
        "properties": {
          "timestamp": Date.now(),
          "accuracy": 10
        }
      }])
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        var locations = res.body;
        should.exist(locations);
        locations.should.be.an('array');
        locations.should.have.length(2);
      })
      .end(done);
  });

  it("should create a location for an event", function (done) {
    mockTokenWithPermission('CREATE_LOCATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var mockLocations = {
      "eventId": 1,
      "geometry": {
        "type": "Point",
        "coordinates": [0, 0]
      },
      "properties": {
        "timestamp": Date.now(),
        "accuracy": 39
      }
    };
    sinon.mock(LocationModel)
      .expects('create')
      .yields(null, mockLocations);

    sinon.mock(CappedLocationModel)
      .expects('findOneAndUpdate')
      .yields(null, {});

    request(app)
      .post('/api/events/1/locations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        },
        "properties": {
          "timestamp": Date.now(),
          "accuracy": 39
        }
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        var location = res.body;
        should.exist(location);
        location.should.be.an('object');
      })
      .end(done);
  });

  it("should fail to create a location for an event when not part of that event", function (done) {
    mockTokenWithPermission('CREATE_LOCATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, []);

    request(app)
      .post('/api/events/1/locations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        },
        "properties": {
          "timestamp": Date.now(),
          "accuracy": 39
        }
      })
      .expect(403)
      .end(done);
  });

  it("should reject new location w/o geometry", function (done) {
    mockTokenWithPermission('CREATE_LOCATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    request(app)
      .post('/api/events/1/locations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        "eventId": 1,
        "properties": {
          "timestamp": Date.now(),
          "accuracy": 39
        }
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.be.equal("Missing required parameter 'geometry'.");
      })
      .end(done);
  });

  it("should reject new location w/o properties", function (done) {
    mockTokenWithPermission('CREATE_LOCATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    request(app)
      .post('/api/events/1/locations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        }
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.be.equal("Missing required parameter 'properties.timestamp'");
      })
      .end(done);
  });

  it("should reject new location w/o timestamp", function (done) {
    mockTokenWithPermission('CREATE_LOCATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    request(app)
      .post('/api/events/1/locations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        "eventId": 1,
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        },
        "properties": {
          "accuracy": 39
        }
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.be.equal("Missing required parameter 'properties.timestamp'");
      })
      .end(done);
  });

});
