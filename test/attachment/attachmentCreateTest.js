var request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , mockfs = require('mock-fs')
  , os = require('os')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;

describe("attachment create tests", function() {

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
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should create attachment for event I am a part of", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    var tmp = os.tmpdir();
    var fs = {
      'mock/path/attachment.jpeg': new Buffer([8, 6, 7, 5, 3, 0, 9]),
      'var/lib/mage': {}
    };
    fs[tmp] = {};
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
      }
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sinon.mock(ObservationModel)
      .expects('update')
      .yields(null, mockObservation);

    request(app)
      .post('/api/events/1/observations/' + observationId + '/attachments')
      .attach('attachment', 'mock/path/attachment.jpeg')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(function(err) {
        mockfs.restore(err);
        done();
      });
  });

  it("should fail to create attachment if no attachment is posted", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    var tmp = os.tmpdir();
    var fs = {
      'mock/path/attachment.jpeg': new Buffer([8, 6, 7, 5, 3, 0, 9]),
      'var/lib/mage': {}
    };
    fs[tmp] = {};
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
      }
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sinon.mock(ObservationModel)
      .expects('update')
      .yields(null, mockObservation);

    request(app)
      .post('/api/events/1/observations/' + observationId + '/attachments')
      .set('Authorization', 'Bearer 12345')
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("no attachment");
      })
      .end(function(err) {
        mockfs.restore(err);
        done();
      });
  });
});
