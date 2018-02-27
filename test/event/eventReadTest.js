var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

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

  it("should read active events if user has read permission in acl", function(done) {
    mockTokenWithPermission('');

    var mockEvent1 = {
      _id: 1,
      name: 'Mock Event',
      acl: {
        userId: userId,
        role: 'GUEST'
      }
    };
    mockEvent1.acl[userId] = 'GUEST';

    var mockEvent2 = {
      _id: 2,
      name: 'Mock Event',
      acl: {}
    };

    var mockCursor = {
      toArray: function(callback) {
        callback(null, [mockEvent1, mockEvent2]);
      }
    };

    sandbox.mock(EventModel.collection)
      .expects('find')
      .withArgs({ complete: { $ne: true } })
      .yields(null, mockCursor);

    request(app)
      .get('/api/events')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function(res) {
        should.exist(res.body);
        res.body.should.be.array;
        expect(res.body).to.have.lengthOf(1);
      })
      .end(done);
  });

  it("should read active events if user is part of a team in event", function(done) {
    mockTokenWithPermission('');

    var eventId = 1;

    var mockEvent1 = new EventModel({
      _id: eventId,
      name: 'Mock Event 123',
      teamIds: [],
      acl: {
        1: 'NONE'
      }
    });
    mockEvent1.teamIds[0] = {
      userIds: [userId]
    };

    var mockEvent2 = new EventModel({
      _id: eventId,
      name: 'Mock Event 267',
      acl: {}
    });

    sandbox.mock(EventModel)
      .expects('populate')
      .yields(null, [mockEvent1, mockEvent2]);

    sandbox.mock(EventModel)
      .expects('find')
      .withArgs({ complete: { $ne: true } })
      .yields(null);

    request(app)
      .get('/api/events?populate=false')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function(res) {
        console.log('res.body', res.body);
        should.exist(res.body);
        res.body.should.be.array;
        expect(res.body).to.have.lengthOf(1);
      })
      .end(done);
  });

  it("should not read events if user is not part of a team in event or in acl", function(done) {
    mockTokenWithPermission('');

    var eventId = 1;

    var mockEvent1 = new EventModel({
      _id: eventId,
      name: 'Mock Event 1',
      acl: {}
    });

    var mockEvent2 = new EventModel({
      _id: eventId,
      name: 'Mock Event 2',
      acl: {}
    });

    sandbox.mock(EventModel)
      .expects('populate')
      .yields(null, [mockEvent1, mockEvent2]);

    sandbox.mock(EventModel)
      .expects('find')
      .withArgs({ complete: { $ne: true } })
      .yields(null);

    request(app)
      .get('/api/events?populate=false')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function(res) {
        console.log('res.body', res.body);
        should.exist(res.body);
        res.body.should.be.array;
        expect(res.body).to.have.lengthOf(0);
      })
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

    sandbox.mock(EventModel)
      .expects('populate')
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

    sandbox.mock(EventModel)
      .expects('populate')
      .yields(null, [mockEvent]);

    request(app)
      .get('/api/events')
      .query({state: 'all'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should read event by id", function(done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    sandbox.mock(EventModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockEvent)
      .onSecondCall()
      .yields(null, mockEvent);

    request(app)
      .get('/api/events/1')
      .query({state: 'all'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should fail to read event by id if event does not exist", function(done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    sandbox.mock(EventModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockEvent)
      .onSecondCall()
      .yields(null, null);

    request(app)
      .get('/api/events/2')
      .query({state: 'all'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(404)
      .end(done);
  });

  it("should read teams in event", function(done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    sandbox.mock(EventModel)
      .expects('findById')
      .chain('populate')
      .withArgs({path: 'teamIds'})
      .chain('exec')
      .yields(null, mockEvent);

    request(app)
      .get('/api/events/1/teams')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should read users in event", function(done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    sandbox.mock(EventModel)
      .expects('findById')
      .chain('populate')
      .withArgs({ path: "teamIds", populate: { path: "userIds" } })
      .chain('exec')
      .yields(null, mockEvent);

    request(app)
      .get('/api/events/1/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should read teams in event", function(done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    sandbox.mock(EventModel)
      .expects('findById')
      .chain('populate')
      .withArgs({
        path: 'teamIds',
        populate: {
          path: 'userIds'
        }
      })
      .chain('exec')
      .yields(null, mockEvent);

    request(app)
      .get('/api/events/1/teams')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .query({populate: 'users'})
      .expect(200)
      .end(done);
  });
});
