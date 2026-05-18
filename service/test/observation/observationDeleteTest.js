'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , EventModel = require('../../lib/models/event')
  , TeamModel = require('../../lib/models/team')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');


require('sinon-mongoose');

const Observation = require('../../lib/models/observation');
const observationModel = Observation.observationModel;

describe("observation delete tests", function () {

  let app;

  beforeEach(function () {
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
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission]));
  }

  it("should update observation state to archived with UPDATE_EVENT role", function (done) {
    mockTokenWithPermission('UPDATE_EVENT');

    sinon.mock(TeamModel)
      .expects('teamsForUserInEvent')
      .yields(null, [{ name: 'Team 1' }]);

    const mockEvent = {
      _id: 1,
      name: 'Mock Event',
      collectionName: 'observations1',
      acl: {}
    };

    sinon.mock(EventModel)
      .expects('getById')
      .yields(null, mockEvent);

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
        timestamp: Date.now()
      },
      userId: mongoose.Types.ObjectId()
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sinon.mock(ObservationModel)
      .expects('update')
      .yields(null, mockObservation);

    request(app)
      .post('/api/events/1/observations/' + observationId.toString() + '/states')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'archive'
      })
      .expect(201)
      .expect(function (res) {
        const state = res.body;
        should.exist(state);
        state.should.have.property('name').and.equal('archive');
      })
      .end(done);
  });

  it("should update observation state to archived with acl update role", function (done) {
    mockTokenWithPermission('');

    sinon.mock(TeamModel)
      .expects('teamsForUserInEvent')
      .yields(null, [{ name: 'Team 1' }]);

    const mockEvent = {
      _id: 1,
      name: 'Mock Event',
      collectionName: 'observations1',
      acl: {}
    };
    mockEvent.acl[userId] = 'MANAGER';

    sinon.mock(EventModel)
      .expects('getById')
      .yields(null, mockEvent);

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
        timestamp: Date.now()
      },
      userId: mongoose.Types.ObjectId()
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sinon.mock(ObservationModel)
      .expects('update')
      .yields(null, mockObservation);

    request(app)
      .post('/api/events/1/observations/' + observationId.toString() + '/states')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'archive'
      })
      .expect(201)
      .expect(function (res) {
        const state = res.body;
        should.exist(state);
        state.should.have.property('name').and.equal('archive');
      })
      .end(done);
  });

  it("should update observation state to archived if observation owner", function (done) {
    mockTokenWithPermission('');

    sinon.mock(TeamModel)
      .expects('teamsForUserInEvent')
      .yields(null, [{ name: 'Team 1' }]);

    const mockEvent = {
      _id: 1,
      name: 'Mock Event',
      collectionName: 'observations1',
      acl: {}
    };

    sinon.mock(EventModel)
      .expects('getById')
      .yields(null, mockEvent);

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
        timestamp: Date.now()
      },
      userId: userId
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sinon.mock(ObservationModel)
      .expects('update')
      .yields(null, mockObservation);

    request(app)
      .post('/api/events/1/observations/' + observationId.toString() + '/states')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'archive'
      })
      .expect(201)
      .expect(function (res) {
        const state = res.body;
        should.exist(state);
        state.should.have.property('name').and.equal('archive');
      })
      .end(done);
  });

  it("should not update observation state if name is missing", function (done) {
    mockTokenWithPermission('DELETE_OBSERVATION');

    const mockEvent = {
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      acl: {}
    };
    sinon.mock(EventModel)
      .expects('getById')
      .yields(null, mockEvent);

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
        timestamp: Date.now()
      },
      userId: userId
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    request(app)
      .post('/api/events/1/observations/' + observationId.toString() + '/states')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal('name required');
      })
      .end(done);
  });

  it("should not update observation state if name is not allowed", function (done) {
    mockTokenWithPermission('DELETE_OBSERVATION');

    const mockEvent = {
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      acl: {}
    };

    sinon.mock(EventModel)
      .expects('getById')
      .yields(null, mockEvent);

    const observationId = mongoose.Types.ObjectId();

    const ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    const mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      },
      userId: userId
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    request(app)
      .post('/api/events/1/observations/' + observationId + '/states')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'foo'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal("state name must be one of 'active', 'complete', 'archive'");
      })
      .end(done);
  });

  it("should not update observation state if name did not change", function (done) {
    mockTokenWithPermission('DELETE_OBSERVATION');

    const mockEvent = {
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      acl: {}
    };

    sinon.mock(EventModel)
      .expects('getById')
      .yields(null, mockEvent);

    sinon.mock(TeamModel)
      .expects('teamsForUserInEvent')
      .yields(null, [{ name: 'Team 1' }]);

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
        timestamp: Date.now()
      },
      userId: userId
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sinon.mock(ObservationModel)
      .expects('update')
      .yields(new Error("some mock error"), null);

    request(app)
      .post('/api/events/1/observations/' + observationId.toString() + '/states')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'archive'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal("state is already 'archive'");
      })
      .end(done);
  });
});
