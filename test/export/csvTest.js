const sinon = require('sinon')
  , expect = require('chai').expect
  , CsvExporter = require('../../export/csv')
  , Writable = require('stream');

require('chai').should();
require('sinon-mongoose');

Writable.prototype.type = function () { };
Writable.prototype.attachment = function () { };

describe("csv export tests", function () {

  afterEach(function () {
    sinon.restore();
  });

  it("should export data as csv", function (done) {
    const event = {
      _id: 1,
      forms: [],
      formMap: []
    }

    const user0 = {
      id: '0',
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
        exportLocations: true
      }
    };

    //TODO stub out observations and locations

    const streamable = new Writable();
    const csvExporter = new CsvExporter(options);

    expect.fail('Not Implemented');
    //csvExporter.export(streamable);

    //TODO read from stream, and verify observations and locations
    done();
  });
});