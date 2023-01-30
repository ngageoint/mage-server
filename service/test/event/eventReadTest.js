var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../lib/models/team');
var TeamModel = mongoose.model('Team');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

const SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');
const { defaultEventPermissionsService: eventPermissions } = require('../../lib/permissions/permissions.events');
const { MageEventPermission } = require('../../lib/entities/authorization/entities.permissions');
const { EventAccessType } = require('../../lib/entities/events/entities.events');

describe("event read tests", function() {

  let app;
  let userId;

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

    userId = mongoose.Types.ObjectId();
    app = require('../../lib/express').app;
  });

  afterEach(function() {
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

  it("should read active events", function(done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sinon.mock(EventModel)
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

    sinon.mock(EventModel.collection)
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
        res.body.should.be.an('array');
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

    sinon.mock(EventModel)
      .expects('populate')
      .yields(null, [mockEvent1, mockEvent2]);

    sinon.mock(EventModel)
      .expects('find')
      .withArgs({ complete: { $ne: true } })
      .yields(null);

    request(app)
      .get('/api/events?populate=false')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function(res) {
        should.exist(res.body);
        res.body.should.be.an('array');
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

    sinon.mock(EventModel)
      .expects('populate')
      .yields(null, [mockEvent1, mockEvent2]);

    sinon.mock(EventModel)
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
        res.body.should.be.an('array');
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
    sinon.mock(EventModel)
      .expects('find')
      .withArgs({ complete: true })
      .yields(null, [mockEvent]);

    sinon.mock(EventModel)
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
    sinon.mock(EventModel)
      .expects('find')
      .withArgs({})
      .yields(null, [mockEvent]);

    sinon.mock(EventModel)
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

    sinon.mock(EventModel)
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

    sinon.mock(EventModel)
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

  it("should read teams page in event", function(done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    const eventId = 1;
    const mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    sinon.mock(EventModel).expects('findById').twice()
      .onFirstCall().yieldsAsync(null, mockEvent)
      .onSecondCall().resolves(mockEvent);

    const mockTeam = new TeamModel({
      _id: 1,
      name: 'Mock Team'
    });

    const mockCursor = {
      toArray: function (callback) {
        callback(null, [mockTeam]);
      }
    };

    sinon.mock(TeamModel.collection)
      .expects('find')
      .yields(null, mockCursor);

    sinon.mock(TeamModel)
      .expects('count')
      .resolves(1);

    request(app)
      .get('/api/events/1/teams?page=0')
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

    var eventMock = sinon.mock(EventModel);

    eventMock.expects('findById')
      .withArgs("1")
      .yields(null, mockEvent);

    eventMock.expects('findById')
      .chain('populate')
      .withArgs({path: 'teamIds', populate: { path: 'userIds' }})
      .chain('exec')
      .yields(null, mockEvent);

    request(app)
      .get('/api/events/1/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should read users in event with team access", function(done) {
    mockTokenWithPermission('');

    const eventId = 1;
    const mockTeam = new TeamModel({
      userIds: [userId],
      acl: {}
    });
    const mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event 123',
      teamIds: [],
      acl: {
        1: 'NONE'
      }
    });
    mockEvent.teamIds[0] = mockTeam;

    const eventMock = sinon.mock(EventModel);

    eventMock.expects('findById')
      .withArgs("1")
      .yields(null, mockEvent);

    sinon.mock(EventModel)
      .expects('populate')
      .yields(null, mockEvent);

    eventMock.expects('findById')
      .chain('populate')
      .withArgs({
        path: 'teamIds',
        populate: {
          path: 'userIds'
        }
      })
      .chain('exec')
      .yields(null, mockEvent);

    sinon.mock(eventPermissions)
      .expects('authorizeEventAccess')
      .withArgs(mockEvent, sinon.match.has('_id', userId), MageEventPermission.READ_EVENT_ALL, EventAccessType.Read)
      .resolves(null)

    request(app)
      .get('/api/events/1/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .query({populate: 'users'})
      .expect(200)
      .end(done);
  });

  it("reads teams in event with team access", async function() {

    mockTokenWithPermission('');

    const eventId = 1;
    const mockTeam = new TeamModel({
      _id: mongoose.Types.ObjectId(),
      userIds: [ userId ],
      acl: {}
    });
    const mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event 123',
      teamIds: [ mockTeam._id ],
      acl: {
        1: 'NONE'
      }
    });

    sinon.mock(EventModel).expects('findById').twice()
      .onFirstCall().yieldsAsync(null, mockEvent)
      .onSecondCall().resolves(mockEvent);

    const mockCursor = {
      toArray: function (callback) {
        callback(null, [mockTeam]);
      }
    };

    sinon.mock(TeamModel.collection)
      .expects('find')
      .yields(null, mockCursor);

    sinon.mock(TeamModel)
      .expects('count')
      .resolves(1);

    sinon.mock(eventPermissions)
      .expects('authorizeEventAccess')
      .withArgs(mockEvent, sinon.match.has('_id', userId), MageEventPermission.READ_EVENT_ALL, EventAccessType.Read)
      .resolves(null)

    const res = await request(app)
      .get('/api/events/1/teams?page=0')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .query({populate: 'users'});

    expect(res.status).to.equal(200)
  });
});