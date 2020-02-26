const request = require('supertest');
const sinon = require('sinon');
const expect = require('chai').expect;
const mongoose = require('mongoose');
const MockToken = require('../mockToken');
const app = require('../../express');
require('sinon-mongoose');
require('../../models/team');
require('../../models/event');
const Observation = require('../../models/observation');
const observationModel = Observation.observationModel;
const TokenModel = mongoose.model('Token');
const TeamModel = mongoose.model('Team');
const EventModel = mongoose.model('Event');

describe("deleting attachments", function() {

  const userId = mongoose.Types.ObjectId();
  const attachmentId = mongoose.Types.ObjectId();
  const observationId = mongoose.Types.ObjectId();
  const eventDoc = {
    _id: 1,
    name: 'Event 1',
    collectionName: 'observations1',
    acl: {}
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

  beforeEach(function() {
    mockEvent = new EventModel(eventDoc);
    mockObservation = new ObservationModel(observationDoc);

    sinon.mock(EventModel)
      .expects('findById')
      .withArgs(sinon.match(eventDoc._id), sinon.match.any)
      .yields(null, mockEvent);

    mockObservationModel = sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('required permissions', function() {

    beforeEach(function() {
      mockObservationModel = sinon.mock(ObservationModel);
      mockObservationModel
        .expects('update')
        .withArgs({ _id: observationId }, { $pull: { attachments: { _id: attachmentId.toString() }}})
        .yields(null, mockObservation);
    });

    it("succeeds when the user has global event update permission", async function() {

      mockTokenWithPermission('UPDATE_EVENT');

      const res = await request(app)
        .delete('/api/events/1/observations/' + observationId + '/attachments/' + attachmentId)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345');

      expect(res.status).to.equal(204);
      mockObservationModel.verify();
    });

    it('succeeds when the user has update permission in the event acl', async function() {

      mockTokenWithPermission('NA');
      mockEvent.acl[userId.toString()] = 'MANAGER';

      sinon.mock(EventModel)
        .expects('populate')
        .withArgs(mockEvent)
        .yields(null, Object.assign(
          { teamIds: [ { name: 'Attachment Deleters', userIds: [ userId ] } ] },
          eventDoc));

      const res = await request(app)
        .delete(`/api/events/1/observations/${observationId}/attachments/${attachmentId}`)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345');

      expect(res.status).to.equal(204);
      mockObservationModel.verify();
    });

    it('succeeds when the user owns the observation', async function() {

      mockObservation.userId = userId;
      mockTokenWithPermission('NA')

      const res = await request(app)
        .delete(`/api/events/1/observations/${observationId}/attachments/${attachmentId}`)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345');

      expect(res.status).to.equal(204);
      mockObservationModel.verify();
    });
  });

  it('fails without correct permission', async function() {

    sinon.mock(ObservationModel).expects('update').never();

    mockTokenWithPermission('READ_OBSERVATION_ALL');

    const res = await request(app)
      .delete(`/api/events/1/observations/${observationId}/attachments/${attachmentId}`)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345');

    expect(res.status).to.equal(403);
  });
});
