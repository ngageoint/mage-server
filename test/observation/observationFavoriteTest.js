const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/event');
var EventModel = mongoose.model('Event');

require('../../models/team');
var TeamModel = mongoose.model('Team');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("marking favorite observations", function () {

  let app;

  const userId = mongoose.Types.ObjectId();

  beforeEach(function () {
    const mockEvent = new EventModel({
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
    });
    mockEvent.acl[userId] = 'GUEST';

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

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("favorites an observation", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
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
        var observation = res.body;
        should.exist(observation);
        var favoriteUserIds = observation.favoriteUserIds;
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
