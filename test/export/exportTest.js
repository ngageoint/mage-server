const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , mockfs = require('mock-fs')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../models/user');
const UserModel = mongoose.model('User');

require('../../models/event');
const EventModel = mongoose.model('Event');

require('../../models/icon');
const IconModel = mongoose.model('Icon');

require('../../models/device');
const DeviceModel = mongoose.model('Device');

const Observation = require('../../models/observation');
const observationModel = Observation.observationModel;

require('../../models/exportmetadata');
const ExportMetadataModel = mongoose.model('ExportMetadata');

describe("export tests", function () {

  afterEach(function () {
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

  it("should export observations as kml - deprecated", function (done) {

    mockTokenWithPermission('READ_OBSERVATION_ALL');

    const eventId = 1;
    const mockEvent = new EventModel({
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

    const ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      style: {}
    });
    const mockObservation = new ObservationModel({
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
      .chain('exec')
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
      .end(function (err) {
        mockfs.restore();
        done(err);
      });
  });

  it("should export observations as kml - background", function (done) {

    mockTokenWithPermission('READ_OBSERVATION_ALL');

    const eventId = 2;
    const mockEvent = new EventModel({
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
        username: 'user3'
      }, {
        username: 'user4'
      }]);

    sinon.mock(DeviceModel)
      .expects('find')
      .chain('exec')
      .resolves([{
        uid: '3'
      }, {
        uid: '4'
      }]);

    const ObservationModel = observationModel({
      _id: 2,
      name: 'Event 2',
      collectionName: 'observations2',
      style: {}
    });
    const mockObservation = new ObservationModel({
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
      .chain('exec')
      .yields(null, [mockObservation]);

    const exportMeta = new ExportMetadataModel({
      _id: mongoose.Types.ObjectId(),
      userId: mongoose.Types.ObjectId(),
      physicalPath: '/tmp',
      exportType: 'kml',
      status: 'Starting',
      options: {
          eventId: eventId,
          filter: null
      }
    });

    sinon.mock(ExportMetadataModel.prototype)
      .expects('save')
      .twice()
      .resolves(exportMeta);

    sinon.mock(IconModel)
      .expects('find')
      .yields(null, [{
        relativePath: 'mock/path'
      }]);

    const fs = {
      '/var/lib/mage/icons/2': {}
    };
    mockfs(fs);

    request(app)
      .post('/api/exports/')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        exportType: 'kml',
        eventId: 2,
        observations: true,
        locations: false,
        attachments: false
      })
      .expect(201)
      .expect(function (res) {
        res.headers.should.have.property('content-type').that.contains('application/json');
        res.headers.should.have.property('location').that.equals('/api/exports/download/' + exportMeta._id);
      })
      .end(function (err) {
        mockfs.restore();
        done(err);
      });
  });
});
