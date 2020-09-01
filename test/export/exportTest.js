var request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , mockfs = require('mock-fs')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../models/user');
var UserModel = mongoose.model('User');

require('../../models/event');
const EventModel = mongoose.model('Event');

require('../../models/icon');
const IconModel = mongoose.model('Icon');

require('../../models/device');
var DeviceModel = mongoose.model('Device');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;

describe("export tests", function() {

  afterEach(function() {
    sinon.restore();
  });

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: '12345' })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  const userId = mongoose.Types.ObjectId();

  it("should export observations as kml", function(done) {

    mockTokenWithPermission('READ_OBSERVATION_ALL');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      collectionName: 'observations1'
    });

    sinon.mock(EventModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockEvent)
      .onSecondCall()
      .yields(null, mockEvent);

    sinon.mock(UserModel)
      .expects('find')
      .chain('exec')
      .yields(null, [{
        username: 'user1'
      }, {
        username: 'user2'
      }]);

    sinon.mock(DeviceModel)
      .expects('find')
      .chain('exec')
      .resolves([{
        uid: '1'
      }, {
        uid: '2'
      }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      style: {}
    });
    var mockObservation = new ObservationModel({
      _id: mongoose.Types.ObjectId(),
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now(),
        forms: []
      }
    });
    sinon.mock(ObservationModel)
      .expects('find')
      .yields(null, [mockObservation]);

    sinon.mock(IconModel)
      .expects('find')
      .yields(null, [{
        relativePath: 'mock/path'
      }]);

    const fs = {
      '/var/lib/mage/icons/1': {}
    };
    mockfs(fs);

    request(app)
      .get('/api/kml?eventId=1&observations=true&locations=false&attachments=false')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        res.headers.should.have.property('content-type').that.equals('application/zip');
        res.headers.should.have.property('content-disposition').that.equals('attachment; filename="mage-kml.zip"');
      })
      .end(function(err) {
        mockfs.restore();
        done(err);
      });
  });
});
