var request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

describe("event read tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should read active events", function(done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sandbox.mock(EventModel)
      .expects('find')
      .withArgs({ complete: { $ne: true } })
      .yields(null, [mockEvent]);

    request(app)
      .get('/api/events')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should read complete events", function(done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sandbox.mock(EventModel)
      .expects('find')
      .withArgs({ complete: true })
      .yields(null, [mockEvent]);

    request(app)
      .get('/api/events')
      .query({state: 'complete'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should read all events", function(done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sandbox.mock(EventModel)
      .expects('find')
      .withArgs({})
      .yields(null, [mockEvent]);

    request(app)
      .get('/api/events')
      .query({state: 'all'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });
});
