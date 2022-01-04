'use strict';

const sinon = require('sinon')
    , expect = require('chai').expect
    , mongoose = require('mongoose')
    , stream = require('stream')
    , util = require('util')
    , JSZip = require('jszip')
    , GeopackageExporter = require('../../lib/export/geopackage')
    , MockToken = require('../mockToken')
    , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../lib/models/team');
const TeamModel = mongoose.model('Team');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

const Observation = require('../../lib/models/observation');
const observationModel = Observation.observationModel;

require('../../lib/models/location');
const LocationModel = mongoose.model('Location');

describe("geopackage export tests", function () {

    const event = {
        _id: 1,
        name: 'Geopackage_Test_Event_1',
        collectionName: 'observations1',
        forms: [],
        formMap: {},
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
        writable.on('finish', async () => {
            const zip = await JSZip.loadAsync(writable.byteArray);
            const gpkg = zip.files['mage-' + event.name + '.gpkg'];
            expect(gpkg).to.be.not.undefined;

            done();
        });

        const exporter = new GeopackageExporter(options);
        exporter.export(writable);
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
