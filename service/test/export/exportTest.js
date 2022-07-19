'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , mockfs = require('mock-fs')
  , path = require('path')
  , createToken = require('../mockToken')
  , DeviceModel = require('../../lib/models/device')
  , IconModel = require('../../lib/models/icon')
  , TokenModel = require('../../lib/models/token')
  , UserModel = require('../../lib/models/user')
  , ExporterFactory = require('../../lib/export/exporterFactory')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration')
  , { defaultEventPermissionsService: eventPermissions } = require('../../lib/permissions/permissions.events')
  , { EventAccessType } = require('../../lib/entities/events/entities.events');

require('sinon-mongoose');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

const Observation = require('../../lib/models/observation');
const observationModel = Observation.observationModel;

require('../../lib/models/export');
const ExportModel = mongoose.model('Export');

describe("export tests", function () {

  let app;

  beforeEach(function () {
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
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission, 'READ_EXPORT']));
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
      .expects('getUsers')
      .yields(null, [{
        username: 'user3'
      }, {
        username: 'user4'
      }]);

    sinon.mock(DeviceModel)
      .expects('getDevices')
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
      .expects('getAll')
      .yields(null, [{
        relativePath: 'mock/path'
      }]);

    sinon.mock(ExporterFactory)
      .expects('createExporter')
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
      .end(() => { });
  });
});
