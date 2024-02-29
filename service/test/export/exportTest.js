const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , mockfs = require('mock-fs')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token')
  , path = require('path');

require('chai').should();
require('sinon-mongoose');

require('../../lib/models/user');
const UserModel = mongoose.model('User');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

require('../../lib/models/icon');
const IconModel = mongoose.model('Icon');

require('../../lib/models/device');
const DeviceModel = mongoose.model('Device');
const Observation = require('../../lib/models/observation');
const { expect } = require('chai')
const observationModel = Observation.observationModel;

require('../../lib/models/export');
const ExportModel = mongoose.model('Export');

const { exportFactory } = require('../../lib/export')
const SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');
const { defaultEventPermissionsService: eventPermissions } = require('../../lib/permissions/permissions.events');
const { EventAccessType } = require('../../lib/entities/events/entities.events');

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

    app = require('../../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
    mockfs.restore();
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

    sinon.mock(eventPermissions)
      .expects('userHasEventPermission')
      .withArgs(2, userId.toHexString(), EventAccessType.Read)
      .resolves(true)

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

    const ExportModelMock = sinon.mock(ExportModel)
    ExportModelMock
      .expects('create')
      .resolves(exportMeta)
    ExportModelMock
      .expects('findByIdAndUpdate')
      .chain('exec')
      .resolves(exportMeta)
    ExportModelMock
      .expects('findByIdAndUpdate')
      .chain('exec')
      .resolves(exportMeta)

    sinon.mock(IconModel)
      .expects('find')
      .yields(null, [{
        relativePath: 'mock/path'
      }]);

    sinon.mock(exportFactory)
      .expects('createExportTransform')
      .returns({
        export() {
          console.info('MOCK EXPORT')
          return Promise.resolve().then(() => done())
        }
      })

    const fs = {
      '/var/lib/mage/icons/2': {},
      '/var/lib/mage/export': {},
      node_modules: mockfs.load(path.resolve(process.cwd(), 'node_modules'))
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
      .end(() => {});
  });
});
