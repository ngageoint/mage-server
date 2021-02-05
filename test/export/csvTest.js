const sinon = require('sinon')
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , stream = require('stream')
  , util = require('util')
  , JSZip = require('jszip')
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

require('../../models/location');
const LocationModel = mongoose.model('Location');

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
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  function parseCSV(buffer) {
    const decoder = new TextDecoder("utf-8");
    const csvContent = decoder.decode(buffer);

    let csvData = [];
    let lbreak = csvContent.split("\n");
    lbreak.forEach(res => {
      csvData.push(res.split(","));
    });

    return csvData;
  }

  it("should populate nothing", function (done) {
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
        exportObservations: false,
        exportLocations: false
      }
    };

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    const writable = new TestWritableStream();
    writable.on('finish', () => {
      const zip = new JSZip(writable.byteArray);
      const observations = zip.files['observations.csv'];
      expect(observations).to.be.undefined;

      const locations = zip.files['locations.csv'];
      expect(locations).to.be.undefined;

      done();
    });

    const csvExporter = new CsvExporter(options);
    csvExporter.export(writable);
  });

  it("should populate observations", function (done) {
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
      const zip = new JSZip(writable.byteArray);
      const locations = zip.files['locations.csv'];
      expect(locations).to.be.undefined;

      const observations = zip.files['observations.csv'];
      expect(observations).to.not.be.null;
      expect(observations._data).to.not.be.null;

      const obsBufferContent = observations._data.getContent();
      expect(obsBufferContent).to.not.be.null;
      const obsCsvData = parseCSV(obsBufferContent);
      expect(obsCsvData.length).to.equal(2);

      expect(obsCsvData[0][3]).to.equal('"Shape Type"');
      expect(obsCsvData[1][3]).to.equal('"Point"');

      expect(obsCsvData[0][4]).to.equal('"Latitude"');
      expect(obsCsvData[1][4]).to.equal('0');

      expect(obsCsvData[0][5]).to.equal('"Longitude"');
      expect(obsCsvData[1][5]).to.equal('0');

      done();
    });

    const csvExporter = new CsvExporter(options);
    csvExporter.export(writable);
  });

  it("should populate locations", function (done) {
    mockTokenWithPermission('READ_LOCATION_ALL');

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
        exportObservations: false,
        exportLocations: true
      }
    };

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(LocationModel)
      .expects('find')
      .chain('cursor')
      .returns(new TestCursor());

    const writable = new TestWritableStream();
    writable.on('finish', () => {
      const zip = new JSZip(writable.byteArray);
      const locations = zip.files['locations.csv'];
      expect(locations).to.not.be.null;
      expect(locations._data).to.not.be.null;

      const locBufferContent = locations._data.getContent();
      expect(locBufferContent).to.not.be.null;
      const locCsvData = parseCSV(locBufferContent);
      expect(locCsvData.length).to.equal(2);

      expect(locCsvData[0][2]).to.equal('"latitude"');
      expect(locCsvData[1][2]).to.equal('1');

      expect(locCsvData[0][3]).to.equal('"longitude"');
      expect(locCsvData[1][3]).to.equal('1');

      expect(locCsvData[0][7]).to.equal('"accuracy"');
      expect(locCsvData[1][7]).to.equal('39');

      done();
    });

    const csvExporter = new CsvExporter(options);
    csvExporter.export(writable);
  });
});

class TestWritableStream {
  constructor() {
    stream.Writable.call(this);
    this.byteArray = [];
  }
  _write(chunk, encoding, done) {
    for (let i = 0; i < chunk.length; i++) {
      this.byteArray.push(chunk[i]);
    }
    done();
  }
};
util.inherits(TestWritableStream, stream.Writable);


class TestCursor {
  constructor() {
    this.i = 0;
    this.locations = [{
      "eventId": 1,
      "geometry": {
        "type": "Point",
        "coordinates": [1, 1]
      },
      "properties": {
        "timestamp": Date.now(),
        "accuracy": 39
      }
    }];
  }
  eachAsync(fn, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = opts || {};

    if (this.i == 0) {
      this.t++;
      return fn(this.locations[this.i], this.i);
    } else {
      return Promise.resolve(this.i);
    }
  }
}