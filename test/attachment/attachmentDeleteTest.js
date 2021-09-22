const request = require('supertest');
const sinon = require('sinon');
const expect = require('chai').expect;
const mongoose = require('mongoose');
const MockToken = require('../mockToken');
require('sinon-mongoose');
require('../../models/team');
require('../../models/event');
const Observation = require('../../models/observation');
const observationModel = Observation.observationModel;
const ObservationIdModel = mongoose.model('ObservationId');
const TokenModel = mongoose.model('Token');
const EventModel = mongoose.model('Event');
const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("deleting attachments", function () {

  let app;
  const userId = mongoose.Types.ObjectId();
  const attachmentId = mongoose.Types.ObjectId();
  const observationId = mongoose.Types.ObjectId();
  const eventDoc = {
    _id: 1,
    name: 'Event 1',
    collectionName: 'observations1',
    acl: {},
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
  };

  const observationDoc = {
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
  };
  const ObservationModel = observationModel(eventDoc);

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: '12345' })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  let mockEvent;
  let mockObservation;
  let mockObservationModel;

  beforeEach(function () {
    mockEvent = new EventModel(eventDoc);
    mockObservation = new ObservationModel(observationDoc);

    sinon.mock(EventModel)
      .expects('findById')
      .withArgs(sinon.match(eventDoc._id), sinon.match.any)
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

  describe('required permissions', function () {

    beforeEach(function () {
      mockObservationModel = sinon.mock(ObservationModel);
      mockObservationModel
        .expects('update')
        .withArgs({ _id: observationId }, { $pull: { attachments: { _id: attachmentId.toString() } } })
        .yields(null, mockObservation);
    });

    it("succeeds when the user has global event update permission", async function () {
      mockTokenWithPermission('UPDATE_EVENT');

      var observationId = mongoose.Types.ObjectId();
      var attachmentId = mongoose.Types.ObjectId();
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
            id: attachmentId,
            action: 'delete'
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

      sinon.mock(ObservationModel)
        .expects('findByIdAndUpdate')
        .withArgs(observationId, { $pull: { attachments: { _id: attachmentId.toString() } } })
        .yields(null, mockObservation);

      const res = await request(app)
        .delete(`/api/events/1/observations/${mockObservation._id}/attachments/${attachmentId}`)
        .set('Authorization', 'Bearer 12345');

      expect(res.status).to.equal(204);
    });

    it("succeeds on delete from form", async function () {
      mockTokenWithPermission('UPDATE_OBSERVATION_ALL');

      var observationId = mongoose.Types.ObjectId();
      var attachmentId = mongoose.Types.ObjectId();
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
            id: attachmentId,
            action: 'delete'
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
                action: 'delete',
                id: attachmentId.toString()
              }]
            }]
          }
        });

      // TODO verify the observationDoc.save has attachment to remove
      expect(res.status).to.equal(200);
    });

    it('succeeds when the user has update permission in the event acl', async function () {
      mockTokenWithPermission('NA');
      mockEvent.acl[userId.toString()] = 'MANAGER';

      var observationId = mongoose.Types.ObjectId();
      var attachmentId = mongoose.Types.ObjectId();
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
        userId: mongoose.Types.ObjectId(),
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
            id: attachmentId,
            action: 'delete'
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

      sinon.mock(ObservationModel)
        .expects('findByIdAndUpdate')
        .withArgs(observationId, { $pull: { attachments: { _id: attachmentId.toString() } } })
        .yields(null, mockObservation);

      const res = await request(app)
        .delete(`/api/events/1/observations/${observationId}/attachments/${attachmentId}`)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345');

      expect(res.status).to.equal(204);
    });

    it('succeeds when the user owns the observation', async function () {
      mockTokenWithPermission('UPDATE_OBSERVATION_ALL');

      var observationId = mongoose.Types.ObjectId();
      var attachmentId = mongoose.Types.ObjectId();
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
        userId: userId,
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
            id: attachmentId,
            action: 'delete'
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

      sinon.mock(ObservationModel)
        .expects('findByIdAndUpdate')
        .withArgs(observationId, { $pull: { attachments: { _id: attachmentId.toString() } } })
        .yields(null, mockObservation);

      const res = await request(app)
        .delete(`/api/events/1/observations/${observationId}/attachments/${attachmentId}`)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345');

      expect(res.status).to.equal(204);
    });
  });

  it('fails without correct permission', async function () {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    var observationId = mongoose.Types.ObjectId();
    var attachmentId = mongoose.Types.ObjectId();
    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    var mockObservation = new ObservationModel({
      _id: observationId,
      userId: mongoose.Types.ObjectId(),
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
          id: attachmentId,
          action: 'delete'
        }]
      }]
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, mockObservation)

    const res = await request(app)
      .delete(`/api/events/1/observations/${mockObservation._id}/attachments/${attachmentId}`)
      .set('Authorization', 'Bearer 12345')
      .set('Accept', 'application/json');

    expect(res.status).to.equal(403);
  });
});
