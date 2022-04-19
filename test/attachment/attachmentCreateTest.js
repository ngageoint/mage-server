const request = require('supertest');
const sinon = require('sinon');
const mongoose = require('mongoose');
const mockfs = require('mock-fs');
const expect = require('chai').expect;
const MockToken = require('../mockToken');
const TokenModel = mongoose.model('Token');
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
var ObservationIdModel = mongoose.model('ObservationId');

describe("creating attachments", function() {

  let app;
  const userId = mongoose.Types.ObjectId();

  beforeEach(function() {
    var mockEvent = EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      forms: [{
        _id: 1,
        fields: [{
          type: "attachment",
          name: "attachment",
          title: "Attachment",
          allowedAttachmentTypes: ['image']
        }],
        userFields: []
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
    beforeEach(function() {
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
    });

    it("creates attachment metadata with global permisison", async function() {

      mockTokenWithPermission('CREATE_OBSERVATION');

      var observationId = mongoose.Types.ObjectId();
      sinon.mock(ObservationIdModel)
        .expects('findById')
        .yields(null, { _id: observationId });

      var ObservationModel = observationModel({
        _id: 1,
        name: 'Event 1',
        collectionName: 'observations1'
      });

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
        forms: [{
          formId: 1,
          'attachment': [{
            action: 'add',
            observationFormId: 1,
            fieldName: 'attachment',
            name: 'test.jpeg',
            contentType: 'image/jpeg'
          }]
        }]
      });

      sinon.mock(ObservationModel)
        .expects('findById')
        .twice()
        .onFirstCall()
        .yields(null, null)
        .onSecondCall()
        .resolves(mockObservation);

      sinon.mock(mockObservation)
        .expects('save')
        .resolves(mockObservation);

      sinon.mock(mockObservation)
        .expects('execPopulate')
        .resolves(mockObservation);

      const res = await request(app)
        .put(`/api/events/1/observations/${mockObservation._id}`)
        .set('Authorization', 'Bearer 12345')
        .send({
          type: 'Feature',
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          },
          properties: {
            type: 'test',
            timestamp: '2016-01-01T00:00:00',
            forms: [{
              formId: 1,
              'attachment': [{
                action: 'add',
                observationFormId: 1,
                fieldName: 'attachment',
                name: 'test.jpeg',
                contentType: 'image/jpeg'
              }]
            }]
          }
        });

      // TODO need to validate that the attachment is saved in observation
      expect(res.status).to.equal(200);
    });

    it('creates an attachment with event permission', async function() {

      mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

      var observationId = mongoose.Types.ObjectId();
      sinon.mock(ObservationIdModel)
        .expects('findById')
        .yields(null, { _id: observationId });

      var ObservationModel = observationModel({
        _id: 1,
        name: 'Event 1',
        collectionName: 'observations1'
      });

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
        forms: [{
          formId: 1,
          'attachment': [{
            action: 'add',
            observationFormId: 1,
            fieldName: 'attachment',
            name: 'test.jpeg',
            contentType: 'image/jpeg'
          }]
        }]
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

      const res = await request(app)
        .put(`/api/events/1/observations/${mockObservation._id}`)
        .set('Authorization', 'Bearer 12345')
        .send({
          type: 'Feature',
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          },
          properties: {
            type: 'test',
            timestamp: '2016-01-01T00:00:00',
            forms: [{
              formId: 1,
              'attachment': [{
                action: 'add',
                observationFormId: 1,
                fieldName: 'attachment',
                name: 'test.jpeg',
                contentType: 'image/jpeg'
              }]
            }]
          }
        });

      expect(res.status).to.equal(200);
    });

    it('fails without proper permission', async function() {

      mockTokenWithPermission('CREATE_OBSERVATION_ALL');
      var observationId = mongoose.Types.ObjectId();
      sinon.mock(ObservationIdModel)
        .expects('findById')
        .yields(null, { _id: observationId });

      var ObservationModel = observationModel({
        _id: 1,
        name: 'Event 1',
        collectionName: 'observations1'
      });

      sinon.mock(ObservationModel)
        .expects('findById')
        .yields(null, null)

      const res = await request(app)
        .put(`/api/events/1/observations/${observationId}`)
        .set('Authorization', 'Bearer 12345')
        .send({
          type: 'Feature',
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          },
          properties: {
            type: 'test',
            timestamp: '2016-01-01T00:00:00',
            forms: [{
              formId: 1,
              'attachment': [{
                action: 'add',
                observationFormId: 1,
                fieldName: 'attachment',
                name: 'test.jpeg',
                contentType: 'image/jpeg'
              }]
            }]
          }
        });

      expect(res.status).to.equal(403);
    });
  });
});
