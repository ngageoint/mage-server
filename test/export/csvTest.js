const sinon = require('sinon')
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , stream = require('stream')
  , util = require('util')
  , CsvExporter = require('../../export/csv')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../models/team');
const TeamModel = mongoose.model('Team');

require('../../models/event');
const EventModel = mongoose.model('Event');

const Observation = require('../../models/observation');
const observationModel = Observation.observationModel;

stream.Writable.prototype.type = function () { };
stream.Writable.prototype.attachment = function () { };

describe("csv export tests", function () {

  const event = {
    _id: 1,
    name: 'Event 1',
    collectionName: 'observations1',
    forms: [],
    acl: {}
  };
  const userId = mongoose.Types.ObjectId();

  beforeEach(function () {
    const mockEvent = new EventModel(event);
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);
  });

  afterEach(function () {
    sinon.restore();
  });

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should export data as csv", function (done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    const user0 = {
      id: userId,
      username: 'test_user_0'
    };
    const users = new Map();
    users[user0.id] = user0;

    const device0 = {
      id: '0',
      uid: '12345'
    };
    const devices = new Map();
    devices[device0.id] = device0;

    const options = {
      event: event,
      users: users,
      devices: devices,
      filter: {
        exportObservations: true,
        exportLocations: false
      }
    };

    //TODO stub out observations and locations
    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    const ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
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

    const writable = new TestWritableStream();
    writable.on('finish', () => {
      //TODO read from stream, and verify observations and locations
      done();
    });

    const csvExporter = new CsvExporter(options);
    csvExporter.export(writable);
  });
});

class TestWritableStream {
  constructor() {
    stream.Writable.call(this);
    this.bufferArray = [];
  }
  _write(chunk, encoding, done) {
    //console.log(chunk.toString());
    this.bufferArray.push(chunk);
    done();
  }
};
util.inherits(TestWritableStream, stream.Writable); 