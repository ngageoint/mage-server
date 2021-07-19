const request = require('supertest');
const sinon = require('sinon');
const mongoose = require('mongoose');
const mockfs = require('mock-fs');
const expect = require('chai').expect;
const MockToken = require('../mockToken');
const TokenModel = mongoose.model('Token');
const env = require('../../environment/env');
const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

require('chai').should();
require('sinon-mongoose');

require('../../models/team');
const TeamModel = mongoose.model('Team');

require('../../models/event');
const EventModel = mongoose.model('Event');

const Observation = require('../../models/observation');
const observationModel = Observation.observationModel;

describe("creating attachments", function() {

  let app;
  const userId = mongoose.Types.ObjectId();

  beforeEach(function() {
    const mockEvent = new EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
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

  afterEach(function() {
    sinon.restore();
    mockfs.restore();
  });

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  describe('required permissions', function() {

    let mockObservation;

    beforeEach(function() {
      const fs = {
        'mock/path/attachment.jpeg': new Buffer([8, 6, 7, 5, 3, 0, 9]),
        'var/lib/mage': {}
      };
      fs[env.tempDirectory] = {};
      mockfs(fs);

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

      const ObservationModel = observationModel({
        _id: 1,
        name: 'Event 1',
        collectionName: 'observations1'
      });
      const observationId = mongoose.Types.ObjectId();
      mockObservation = new ObservationModel({
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
        .withArgs(observationId.toString())
        .yields(null, mockObservation);

      sinon.mock(ObservationModel)
        .expects('update')
        .yields(null, mockObservation);
    });

    it("creates attachment with global permisison", async function() {

      mockTokenWithPermission('UPDATE_OBSERVATION_ALL');

      const res = await request(app)
        .post(`/api/events/1/observations/${mockObservation._id}/attachments`)
        .attach('attachment', 'mock/path/attachment.jpeg')
        .set('Authorization', 'Bearer 12345');

      expect(res.status).to.equal(200);
    });

    it('creates an attachment with event permission', async function() {

      mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

      const res = await request(app)
        .post(`/api/events/1/observations/${mockObservation._id}/attachments`)
        .attach('attachment', 'mock/path/attachment.jpeg')
        .set('Authorization', 'Bearer 12345');

      expect(res.status).to.equal(200);
    });

    it('fails without proper permission', async function() {

      mockTokenWithPermission('CREATE_OBSERVATION_ALL');

      const res = await request(app)
        .post(`/api/events/1/observations/${mockObservation._id}/attachments`)
        .attach('attachment', 'mock/path/attachment.jpeg')
        .set('Authorization', 'Bearer 12345');

      expect(res.status).to.equal(403);
    });
  });

  it("fails without a request body", async function() {

    mockTokenWithPermission('UPDATE_OBSERVATION_ALL');

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
      }
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sinon.mock(ObservationModel)
      .expects('update')
      .yields(null, mockObservation);

    const res = await request(app)
      .post('/api/events/1/observations/' + observationId + '/attachments')
      .set('Authorization', 'Bearer 12345');

    expect(res.status).to.equal(400);
    expect(res.text).to.equal('no attachment');
  });
});
