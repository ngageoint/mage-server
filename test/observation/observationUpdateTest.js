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

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;
var ObservationIdModel = mongoose.model('ObservationId');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("observation update tests", function () {

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

  it("should update observation for id with event permission", function (done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

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
    var observationId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: '2014-01-01T00:00:00'
      }
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockObservation)
      .onSecondCall()
      .resolves(mockObservation);

    sinon.mock(mockObservation)
      .expects('save')
      .resolves(mockObservation);

    sinon.mock(mockObservation)
      .expects('execPopulate')
      .resolves(mockObservation);

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
          timestamp: '2014-01-01T00:00:00'
        }
      })
      .expect(200)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
        observation.should.have.property('id');
        observation.should.have.property('url');
      })
      .end(done);
  });

  it("should update observation for id with all permission", function (done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_ALL');

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
    var observationId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: '2014-01-01T00:00:00'
      }
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockObservation)
      .onSecondCall()
      .resolves(mockObservation);

    sinon.mock(mockObservation)
      .expects('save')
      .resolves(mockObservation);

    sinon.mock(mockObservation)
      .expects('execPopulate')
      .resolves(mockObservation);

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
          timestamp: '2014-01-01T00:00:00'
        }
      })
      .expect(200)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
        observation.should.have.property('id');
        observation.should.have.property('url');
      })
      .end(done);
  });

  it("should deny update observation for id w/o timestamp", function (done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

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

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, {});

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
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Date is required\n");
      })
      .end(done);
  });

  it("should deny update observation for id w/o geometry", function (done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

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

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, {});

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        properties: {
          timestamp: '2014-01-01T00:00:00'
        }
      })
      .expect(400)
      .expect(function(res) {
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Location is required\n");
      })
      .end(done);
  });

  it("should deny update observation for id with invalid geometry", function (done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

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

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, {});

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [-181, 0]
        },
        properties: {
          timestamp: '2014-01-01T00:00:00'
        }
      })
      .expect(400)
      .expect(function(res) {
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Location must be GeoJSON\n");
      })
      .end(done);
  });

  it("should deny update observation for id that does not exist", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

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

    var observationId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, null)

    sinon.mock(mockObservation)
      .expects('save')
      .resolves(mockObservation);

    request(app)
      .put('/api/events/1/observations/' + observationId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          timestamp: '2014-01-01T00:00:00'
        }
      })
      .expect(404)
      .end(done);
  });

  it("should deny update observation for event I am not part of", function (done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var mockEvent = {
      name: 'Event 1',
      teamIds: [{
        name: 'Team 1',
        userIds: [mongoose.Types.ObjectId()]
      }],
      acl: {}
    };

    sinon.mock(EventModel)
      .expects('populate')
      .withArgs(sinon.match.any, 'teamIds')
      .yields(null, mockEvent);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var observationId = mongoose.Types.ObjectId();
    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, { _id: observationId });

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
      .expect(function (res) {
        res.text.should.equal('Forbidden');
      })
      .end(done);
  });
});
