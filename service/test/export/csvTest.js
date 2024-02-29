'use strict';

const sinon = require('sinon')
const expect = require('chai').expect
const mongoose = require('mongoose')
const stream = require('stream')
const util = require('util')
const JSZip = require('jszip')
const { Csv: CsvExporter } = require('../../lib/export/csv')
const MockToken = require('../mockToken')
const TokenModel = mongoose.model('Token')

require('chai').should();
require('sinon-mongoose');

require('../../lib/models/team');
const TeamModel = mongoose.model('Team');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

const Observation = require('../../lib/models/observation');

require('../../lib/models/location');
const LocationModel = mongoose.model('Location');

const User = require('../../lib/models/user');
const UserModel = mongoose.model('User');

const Device = require('../../lib/models/device');
const DeviceModel = mongoose.model('Device');

stream.Writable.prototype.type = function () { };
stream.Writable.prototype.attachment = function () { };

const userId = mongoose.Types.ObjectId();
const deviceId = mongoose.Types.ObjectId();

describe("csv export tests", function () {

  let event
  let user
  let device

  beforeEach(function () {
    event = new EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      forms: [],
      acl: {}
    })
    user = {
      _id: userId,
      username: 'csv.export.test',
      displayName: 'CSV Export Test'
    }
    device = {
      _id: deviceId,
      uid: '123456'
    }
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, event);

    const mockUser = new UserModel(user);
    sinon.mock(User)
      .expects('getUserById')
      .resolves(mockUser);

    const mockDevice = new DeviceModel(device);
    sinon.mock(Device)
      .expects('getDeviceById')
      .resolves(mockDevice);
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
      event,
      users,
      devices,
      filter: {
        exportObservations: false,
        exportLocations: false
      }
    };

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    const writable = new TestWritableStream();
    writable.on('finish', async () => {
      const zip = await JSZip.loadAsync(writable.byteArray);
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

    const options = {
      event,
      filter: {
        exportObservations: true,
        exportLocations: false
      }
    };

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(LocationModel)
      .expects('find')
      .chain('cursor')
      .returns(new TestLocationCursor());

    sinon.mock(Observation)
      .expects('getObservations')
      .returns(new TestObservationCursor());

    const writable = new TestWritableStream();
    writable.on('finish', async () => {
      const zip = await JSZip.loadAsync(writable.byteArray);
      const locations = zip.files['locations.csv'];
      expect(locations).to.be.undefined;

      const observations = zip.files['observations.csv'];
      expect(observations).to.not.be.null;

      const obsContent = await observations.async('nodebuffer');
      const obsCsvData = parseCSV(obsContent);
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

    const options = {
      event,
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
      .returns(new TestLocationCursor());

    sinon.mock(Observation)
      .expects('getObservations')
      .returns(new TestObservationCursor());

    const writable = new TestWritableStream();
    writable.on('finish', async () => {
      const zip = await JSZip.loadAsync(writable.byteArray);
      const locations = zip.files['locations.csv'];
      expect(locations).to.not.be.null;

      const locBufferContent = await locations.async('nodebuffer');
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


class TestLocationCursor {
  constructor() {
    this.i = 0;
    this.locations = [{
      _id: mongoose.Types.ObjectId(),
      "eventId": 1,
      "geometry": {
        "type": "Point",
        "coordinates": [1, 1]
      },
      "properties": {
        "timestamp": Date.now(),
        "accuracy": 39,
        deviceId: deviceId
      },
      userId: userId
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

class TestObservationCursor {
  constructor() {
    this.i = 0;

    const mockObservation = {
      _id: 1,
      userId: userId,
      deviceId: deviceId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now(),
        forms: []
      }
    };

    this.observations = [mockObservation];
  }
  eachAsync(fn, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = opts || {};

    if (this.i == 0) {
      this.t++;
      return fn(this.observations[this.i], this.i);
    } else {
      return Promise.resolve(this.i);
    }
  }
}