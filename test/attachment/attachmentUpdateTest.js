const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const mongoose = require('mongoose');
const mockfs = require('mock-fs');
const MockToken = require('../mockToken');
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

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe('updating attachments', function () {

  let app;

  beforeEach(function () {
    var mockEvent = new EventModel({
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

  afterEach(function () {
    sinon.restore();
    mockfs.restore();
  });

  const userId = mongoose.Types.ObjectId();

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("updates an attachment with event update permission", async function () {
    mockTokenWithPermission('CREATE_OBSERVATION');

    var fs = {
      'mock/path/attachment.jpeg': Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 72, 0, 72, 0, 0, 255, 225, 0, 140, 69, 120, 105, 102, 0, 0, 77, 77, 0, 42, 0, 0, 0, 8, 0, 5, 1, 18, 0, 3, 0, 0, 0, 1, 0, 1, 0, 0, 1, 26, 0, 5, 0, 0, 0, 1, 0, 0, 0, 74, 1, 27, 0, 5, 0, 0, 0, 1, 0, 0, 0, 82, 1, 40, 0, 3, 0, 0, 0, 1, 0, 2, 0, 0, 135, 105, 0, 4, 0, 0, 0, 1, 0, 0, 0, 90, 0, 0, 0, 0, 0, 0, 0, 72, 0, 0, 0, 1, 0, 0, 0, 72, 0, 0, 0, 1, 0, 3, 160, 1, 0, 3, 0, 0, 0, 1, 0, 1, 0, 0, 160, 2, 0, 4, 0, 0, 0, 1, 0, 0, 0, 1, 160, 3, 0, 4, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 255, 237, 0, 56, 80, 104, 111, 116, 111, 115, 104, 111, 112, 32, 51, 46, 48, 0, 56, 66, 73, 77, 4, 4, 0, 0, 0, 0, 0, 0, 56, 66, 73, 77, 4, 37, 0, 0, 0, 0, 0, 16, 212, 29, 140, 217, 143, 0, 178, 4, 233, 128, 9, 152, 236, 248, 66, 126, 255, 192, 0, 17, 8, 0, 1, 0, 1, 3, 1, 34, 0, 2, 17, 1, 3, 17, 1, 255, 196, 0, 31, 0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 255, 196, 0, 181, 16, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125, 1, 2, 3, 0, 4, 17, 5, 18, 33, 49, 65, 6, 19, 81, 97, 7, 34, 113, 20, 50, 129, 145, 161, 8, 35, 66, 177, 193, 21, 82, 209, 240, 36, 51, 98, 114, 130, 9, 10, 22, 23, 24, 25, 26, 37, 38, 39, 40, 41, 42, 52, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 255, 196, 0, 31, 1, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 255, 196, 0, 181, 17, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119, 0, 1, 2, 3, 17, 4, 5, 33, 49, 6, 18, 65, 81, 7, 97, 113, 19, 34, 50, 129, 8, 20, 66, 145, 161, 177, 193, 9, 35, 51, 82, 240, 21, 98, 114, 209, 10, 22, 36, 52, 225, 37, 241, 23, 24, 25, 26, 38, 39, 40, 41, 42, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 130, 131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 226, 227, 228, 229, 230, 231, 232, 233, 234, 242, 243, 244, 245, 246, 247, 248, 249, 250, 255, 219, 0, 67, 0, 3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 3, 3, 3, 3, 4, 7, 4, 4, 4, 4, 4, 8, 6, 6, 5, 7, 10, 9, 10, 10, 10, 9, 9, 9, 11, 12, 15, 13, 11, 11, 15, 12, 9, 9, 13, 18, 14, 15, 16, 16, 17, 17, 17, 10, 13, 19, 20, 19, 17, 20, 15, 17, 17, 17, 255, 219, 0, 67, 1, 3, 3, 3, 4, 4, 4, 8, 4, 4, 8, 17, 11, 9, 11, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 255, 221, 0, 4, 0, 1, 255, 218, 0, 12, 3, 1, 0, 2, 17, 3, 17, 0, 63, 0, 241, 202, 40, 162, 189, 83, 207, 63, 255, 217]),
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
    const observationFormId = mongoose.Types.ObjectId();
    const attachmentId = mongoose.Types.ObjectId();

    const mockAttachment = new AttachmentModel({
      _id: attachmentId,
      name: 'attachment.jpeg',
      contentType: 'image/jpeg',
      size: 4096,
      relativePath: 'some/relative/path/image.jpeg',
      fieldName: 'attachment',
      observationFormId: observationFormId
    });

    const mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now(),
        forms: [{
          _id: observationFormId,
          formId: 1,
          'attachment': [{
            action: 'add',
            observationFormId: observationFormId,
            fieldName: 'attachment',
            name: 'test.jpeg',
            contentType: 'image/jpeg'
          }]
        }]
      },
      attachments: [mockAttachment]
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockObservation)
      .onSecondCall()
      .resolves(mockObservation);

    sinon.mock(ObservationModel)
      .expects('findOneAndUpdate')
      .yields(null, mockObservation)
      .withArgs({
        _id: observationId,
        attachments: {
          '$elemMatch': {
            _id: attachmentId.toString(),
            contentType: 'image/jpeg',
            name: 'attachment.jpeg'
          }
        }
      },{
        'attachments.$.size': 839,
        'attachments.$.relativePath': sinon.match.any
      });

    const res = await request(app)
      .put('/api/events/1/observations/' + observationId + '/attachments/' + attachmentId)
      .attach('attachment', 'mock/path/attachment.jpeg')
      .set('Authorization', 'Bearer 12345');

    expect(res.status).to.equal(200);
  });
});
