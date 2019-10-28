const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const mongoose = require('mongoose');
const mockfs = require('mock-fs');
const MockToken = require('../mockToken');
const app = require('../../express');
const TokenModel = mongoose.model('Token');
const env = require('../../environment/env');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;
var AttachmentModel = mongoose.model('Attachment');

describe.only('updating attachments', function() {

  beforeEach(function() {
    var mockEvent = new EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);
  });

  afterEach(function() {
    sinon.restore();
    mockfs.restore();
  });

  const userId = mongoose.Types.ObjectId();

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("updates an attachment with event update permission", async function() {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

    var fs = {
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

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    var attachmentId = mongoose.Types.ObjectId();
    var mockAttachment = new AttachmentModel({
      _id: attachmentId,
      name: 'attachment.jpeg',
      contentType: 'image/jpeg',
      size: 4096,
      relativePath: 'some/relative/path/image.jpeg'
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
        timestamp: Date.now()
      },
      attachments: [ mockAttachment ]
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sinon.mock(ObservationModel)
      .expects('findOneAndUpdate')
      .yields(null, mockObservation);

    const res = await request(app)
      .put('/api/events/1/observations/' + observationId + '/attachments/' + attachmentId)
      .attach('attachment', 'mock/path/attachment.jpeg')
      .set('Authorization', 'Bearer 12345');

    expect(res.status).to.equal(200);
  });
});
