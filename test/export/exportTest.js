const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , mockfs = require('mock-fs')
  , MockToken = require('../mockToken')
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

require('../../models/export');
const ExportModel = mongoose.model('Export');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("export tests", function () {

  let app;

  beforeEach(function() {
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

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: '12345' })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission, 'READ_EXPORT']));
  }

  const userId = mongoose.Types.ObjectId();

  it("should export observations as kml", function (done) {

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

    const exportMeta = new ExportModel({
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

    sinon.mock(ExportModel)
      .expects('create')
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
        res.headers.should.have.property('location').that.equals('/api/exports/' + exportMeta._id);
      })
      .end(function (err) {
        mockfs.restore();
        done(err);
      });
  });
});
