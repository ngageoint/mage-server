'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('sinon-mongoose');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

const Observation = require('../../lib/models/observation');
const observationModel = Observation.observationModel;

describe("observation important tests", function () {

  let app;

  beforeEach(function () {

    const mockEvent = new EventModel({
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

    app = require('../../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();
  function mockTokenWithPermissions(permissions) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, permissions));
  }

  it("should flag observation as important", function (done) {
    mockTokenWithPermissions(['CREATE_OBSERVATION', 'UPDATE_EVENT']);

    const ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    const observationId = mongoose.Types.ObjectId();
    const mockObservation = new ObservationModel({
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

      const observationMock = sinon.mock(ObservationModel)
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
        const observation = res.body;
        should.exist(observation);
        const important = observation.important;
        should.exist(important);
        important.should.have.property('userId').that.equals(userId.toString());
        important.should.have.property('description').that.equals('test');
      })
      .end(done);
  });

  it("should fail to flag observation as important if observation does not exist", function (done) {
    mockTokenWithPermissions(['CREATE_OBSERVATION', 'UPDATE_EVENT']);

    const ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    const observationId = mongoose.Types.ObjectId();
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

    const ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    const observationId = mongoose.Types.ObjectId();
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

    const ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    const observationId = mongoose.Types.ObjectId();
    const mockObservation = new ObservationModel({
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

      const observationMock = sinon.mock(ObservationModel)
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
        const observation = res.body;
        should.exist(observation);
        should.not.exist(observation.important);
      })
      .end(done);
  });
});
