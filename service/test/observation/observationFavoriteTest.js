
'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  // TODO: require for side-effects smells
  , EventModel = require('../../lib/models/event')
  , TeamModel = require('../../lib/models/team')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('sinon-mongoose');

const Observation = require('../../lib/models/observation');
const observationModel = Observation.observationModel;

describe("marking favorite observations", function () {

  let app;

  const userId = mongoose.Types.ObjectId();

  beforeEach(function () {
    const mockEvent = {
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      form: {
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
      },
      acl: {}
    };
    mockEvent.acl[userId] = 'GUEST';

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

  it("favorites an observation", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

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
        timestamp: '2016-01-01T00:00:00'
      },
      favoriteUserIds: [userId]
    });

    const observationMock = sinon.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .withArgs(observationId.toString(), sinon.match({ '$addToSet': { favoriteUserIds: userId } }), sinon.match.any)
      .yields(null, mockObservation);

    request(app)
      .put(`/api/events/1/observations/${observationId}/favorite`)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        observationMock.verify();
        const observation = res.body;
        should.exist(observation);
        const favoriteUserIds = observation.favoriteUserIds;
        should.exist(favoriteUserIds);
        favoriteUserIds.should.be.a('array');
        favoriteUserIds.should.contain(userId.toString());
      })
      .end(done);
  });

  it("unfavorites an observation", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

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
        timestamp: '2016-01-01T00:00:00'
      },
      favoriteUserIds: []
    });

    const observationMock = sinon.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .withArgs(observationId.toString(), sinon.match({ '$pull': { favoriteUserIds: userId } }), sinon.match.any)
      .yields(null, mockObservation);

    request(app)
      .delete(`/api/events/1/observations/${observationId}/favorite`)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        observationMock.verify();
        const observation = res.body;
        should.exist(observation);
        const favoriteUserIds = observation.favoriteUserIds;
        should.exist(favoriteUserIds);
        favoriteUserIds.should.be.empty;
      })
      .end(done);
  });

  it('requires observation update permission', async function () {

    mockTokenWithPermission('READ_OBSERVATION_ALL');

    const ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    const observationId = mongoose.Types.ObjectId();
    const observationMock = sinon.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .never();

    const res = await request(app)
      .put('/api/events/1/observations/' + observationId + '/favorite')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345');

    expect(res.status).to.equal(403);

    observationMock.verify();
  });
});
