var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("observation important tests", function () {

  let app;

  beforeEach(function () {

    var mockEvent = new EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      forms: [{
        id: 1,
        fields: [{
          type: "date",
          name: "timestamp",
          title: "Date",
          required: true
        }, {
          type: "geometry",
          name: "geometry",
          title: "Location",
          required: true
        }, {
          type: "dropdown",
          name: "field1",
          title: "type",
          choices: [{
            id: 1,
            value: 1,
            title: 'test'
          }],
          required: true
        }],
        userFields: []
      }],
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
  function mockTokenWithPermissions(permissions) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, permissions));
  }

  it("should flag observation as important", function (done) {
    mockTokenWithPermissions(['CREATE_OBSERVATION', 'UPDATE_EVENT']);

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
      important: {
        userId: userId,
        description: 'test'
      }
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    var observationMock = sinon.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .withArgs(observationId, sinon.match({ 'important': sinon.match({ userId: userId }) }), sinon.match.any)
      .chain('populate').withArgs({ path: 'userId', select: 'displayName' })
      .chain('populate').withArgs({ path: 'important.userId', select: 'displayName' })
      .chain('exec')
      .yields(null, mockObservation);

    request(app)
      .put('/api/events/1/observations/' + observationId + '/important')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        description: 'Some important description.'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        observationMock.verify();
        var observation = res.body;
        should.exist(observation);
        var important = observation.important;
        should.exist(important);
        important.should.have.property('userId').that.equals(userId.toString());
        important.should.have.property('description').that.equals('test');
      })
      .end(done);
  });

  it("should fail to flag observation as important if observation does not exist", function (done) {
    mockTokenWithPermissions(['CREATE_OBSERVATION', 'UPDATE_EVENT']);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    var observationId = mongoose.Types.ObjectId();
    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + observationId + '/important')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        description: 'Some important description'
      })
      .expect(404)
      .end(done);
  });

  it("should fail to flag observation as important without permissions", function (done) {
    mockTokenWithPermissions(['CREATE_OBSERVATION']);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    var observationId = mongoose.Types.ObjectId();
    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, {});

    request(app)
      .put('/api/events/1/observations/' + observationId + '/important')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        description: 'Some important description.'
      })
      .expect(403)
      .end(done);
  });

  it("should remove observation important flag", function (done) {
    mockTokenWithPermissions(['CREATE_OBSERVATION', 'UPDATE_EVENT']);

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

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    var observationMock = sinon.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .withArgs(observationId, sinon.match({ '$unset': { important: 1 } }), sinon.match.any)
      .yields(null, mockObservation);

    request(app)
      .delete('/api/events/1/observations/' + observationId + '/important')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        observationMock.verify();
        var observation = res.body;
        should.exist(observation);
        should.not.exist(observation.important);
      })
      .end(done);
  });
});
