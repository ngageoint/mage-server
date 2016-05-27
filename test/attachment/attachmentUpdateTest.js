var request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , mockfs = require('mock-fs')
  , os = require('os')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;
var AttachmentModel = mongoose.model('Attachment');

describe("attachment update tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function() {
    var mockEvent = new EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);
  });

  afterEach(function() {
    sandbox.restore();
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should update attachment for event I am a part of", function(done) {
    mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

    var tmp = os.tmpdir();
    var fs = {
      'mock/path/attachment.jpeg': new Buffer([8, 6, 7, 5, 3, 0, 9]),
      'var/lib/mage': {}
    };
    fs[tmp] = {};
    mockfs(fs);

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sandbox.mock(EventModel)
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

    sandbox.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sandbox.mock(ObservationModel)
      .expects('findOneAndUpdate')
      .yields(null, mockObservation);

    request(app)
      .put('/api/events/1/observations/' + observationId + '/attachments/' + attachmentId)
      .attach('attachment', 'mock/path/attachment.jpeg')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(function() {
        mockfs.restore();
        done();
      });
  });
});
