var request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , fs = require('fs')
  , stream = require('stream')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;

describe("attachment create tests", function() {

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
    var token =  {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function(field, callback) {
          callback(null, {
            _id: userId,
            username: 'test',
            roleId: {
              permissions: [permission]
            }
          });
        }
      }
    };

    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);
  }

  it("should create attachment for event I am a part of", function(done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

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

    sandbox.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sandbox.mock(ObservationModel)
      .expects('update')
      .yields(null, mockObservation);

    var mockedStream = new stream.Readable();
    mockedStream._read = function noop() {
      this.push(new Buffer([1,2,3,4,5]), 'binary');
      this.push(null);
      this.emit('close');
    };

    sandbox.mock(fs)
      .expects('createReadStream')
      .returns(mockedStream);

    request(app)
      .post('/api/events/1/observations/' + observationId + '/attachments')
      .attach('attachment', 'mock/path/attachment.jpeg')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });
});
