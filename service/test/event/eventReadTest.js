'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration')
  , { defaultEventPermissionsService: eventPermissions } = require('../../lib/permissions/permissions.events')
  , { MageEventPermission } = require('../../lib/entities/authorization/entities.permissions')
  , { EventAccessType } = require('../../lib/entities/events/entities.events');

require('sinon-mongoose');

require('../../lib/models/team');
const TeamModel = mongoose.model('Team');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

describe("event read tests", function () {

  let app;
  let userId;

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

    sinon.stub(TeamModel, 'find').returns({
      lean: sinon.stub().resolves([])
    });

    sinon.stub(EventModel, 'count').returns({
      exec: sinon.stub().resolves(0)
    });

    userId = new mongoose.Types.ObjectId();
    app = require('../../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
  });

  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission]));
  }

  it("should read active events", function (done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    const eventId = 1;
    const mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    const chain = {
      sort: function () { return chain; },
      collation: function () { return chain; },
      limit: function () { return chain; },
      skip: function () { return chain; },
      exec: function (cb) {
        cb(null, [mockEvent]);
      }
    };
    const findStub = sinon.stub(EventModel, 'find').callsFake((query, projection) => {
      expect(query).to.have.property('complete');
      expect(query.complete).to.deep.equal({ $ne: true });
      return chain;
    });

    sinon.stub(EventModel, 'countDocuments').returns({
      exec: sinon.stub().resolves(1)
    });

    request(app)
      .get('/api/events')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        should.exist(res.body);
        res.body.should.be.an('array');
        expect(findStub.calledOnce).to.be.true;
      })
      .end(done);
  });

  it("should read active events if user has read permission in acl", function (done) {
    mockTokenWithPermission('');

    const mockEvent1 = new EventModel({
      _id: 1,
      name: 'Mock Event',
      acl: {}
    });
    mockEvent1.acl[userId] = 'GUEST';

    const chain = {
      sort: () => chain,
      collation: () => chain,
      limit: () => chain,
      skip: () => chain,
      exec: (cb) => {
        cb(null, [mockEvent1]);
      }
    };
    const findStub = sinon.stub(EventModel, 'find').callsFake((query, projection) => {
      expect(query).to.have.property('$and');
      expect(query.$and).to.be.an('array').with.length.greaterThan(0);

      expect(query).to.have.property('complete');
      expect(query.complete).to.deep.equal({ $ne: true });

      const accessClause = query.$and.find(clause => clause.$or);
      expect(accessClause).to.exist;
      expect(accessClause.$or).to.be.an('array').with.length(2);

      const teamClause = accessClause.$or.find(clause => clause.teamIds);
      expect(teamClause).to.exist;
      expect(teamClause.teamIds).to.have.property('$in');
      expect(teamClause.teamIds.$in).to.be.an('array');

      const aclClause = accessClause.$or.find(clause => clause[`acl.${userId.toString()}`]);
      expect(aclClause).to.exist;
      expect(aclClause[`acl.${userId.toString()}`]).to.have.property('$in');

      const allowedRoles = aclClause[`acl.${userId.toString()}`].$in;
      expect(allowedRoles).to.include.members(['OWNER', 'MANAGER', 'GUEST']);
      expect(allowedRoles).to.have.lengthOf(3);

      expect(allowedRoles).to.not.include('NONE');
      expect(allowedRoles).to.not.include('ADMIN');

      return chain;
    });

    request(app)
      .get('/api/events')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        should.exist(res.body);
        res.body.should.be.an('array');
        expect(findStub.calledOnce).to.be.true;
      })
      .end(done);
  });

  it("should read active events if user is part of a team in event", function (done) {
    mockTokenWithPermission('');

    const eventId = 1;

    const team1 = new TeamModel({
      _id: new mongoose.Types.ObjectId(),
      name: 'Team 1',
      userIds: [userId],
      acl: {}
    });

    const mockEvent1 = new EventModel({
      _id: eventId,
      name: 'Mock Event 123',
      teamIds: [team1],
      acl: {
        1: 'NONE'
      }
    });

    const chain = {
      sort: () => chain,
      collation: () => chain,
      limit: () => chain,
      skip: () => chain,
      exec: (cb) => {
        cb(null, [mockEvent1]);
      }
    };
    const findStub = sinon.stub(EventModel, 'find').callsFake((query, projection) => {
      expect(query).to.have.property('$and');
      expect(query.$and).to.be.an('array').with.length.greaterThan(0);

      const teamClause = query.$and.find(clause =>
        clause.$or && clause.$or.some(orClause =>
          orClause.teamIds && orClause.teamIds.$in
        )
      );
      expect(teamClause).to.exist;

      expect(query).to.have.property('complete');
      expect(query.complete).to.deep.equal({ $ne: true });

      return chain;
    });

    sinon.stub(EventModel, 'populate').callsFake((docs, paths, cb) => {
      setImmediate(() => cb(null, docs));
    });

    request(app)
      .get('/api/events?populate=false')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        should.exist(res.body);
        res.body.should.be.an('array');
        expect(findStub.calledOnce).to.be.true;
      })
      .end(done);
  });

  it("should not read events if user is not part of a team in event or in acl", function (done) {
    mockTokenWithPermission('');

    const eventId = 1;

    const mockEvent1 = new EventModel({
      _id: eventId,
      name: 'Mock Event 1',
      acl: {}
    });

    const chain2 = {
      sort: () => chain2,
      collation: () => chain2,
      limit: () => chain2,
      skip: () => chain2,
      exec: (cb) => {
        cb(null, []);
      }
    };
    const findStub = sinon.stub(EventModel, 'find').callsFake((query, projection) => {
      expect(query).to.have.property('$and');
      expect(query.$and).to.be.an('array').with.length.greaterThan(0);

      expect(query).to.have.property('complete');
      expect(query.complete).to.deep.equal({ $ne: true });

      const accessClause = query.$and.find(clause =>
        clause.$or && (
          clause.$or.some(orClause => orClause.teamIds) ||
          clause.$or.some(orClause => orClause[`acl.${userId.toString()}`])
        )
      );
      expect(accessClause).to.exist;

      return chain2;
    });

    sinon.stub(EventModel, 'populate').callsFake((docs, paths, cb) => {
      setImmediate(() => cb(null, docs));
    });

    request(app)
      .get('/api/events?populate=false')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        should.exist(res.body);
        res.body.should.be.an('array');
        expect(res.body).to.have.lengthOf(0);
        expect(findStub.calledOnce).to.be.true;
      })
      .end(done);
  });

  it("should read complete events", function (done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    const eventId = 1;
    const mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    const chain3 = {
      sort: () => chain3,
      collation: () => chain3,
      limit: () => chain3,
      skip: () => chain3,
      exec: (cb) => {
        cb(null, [mockEvent]);
      }
    };
    const findStub = sinon.stub(EventModel, 'find').callsFake((query, projection) => {
      expect(query).to.have.property('complete', true);
      return chain3;
    });

    sinon.stub(EventModel, 'populate').callsFake((docs, paths, cb) => {
      setImmediate(() => cb(null, docs));
    });

    request(app)
      .get('/api/events')
      .query({ state: 'complete' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        should.exist(res.body);
        res.body.should.be.an('array');
        expect(findStub.calledOnce).to.be.true;
      })
      .end(done);
  });

  it("should read all events", function (done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    const eventId = 1;
    const mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    const chain4 = {
      sort: () => chain4,
      collation: () => chain4,
      limit: () => chain4,
      skip: () => chain4,
      exec: (cb) => {
        cb(null, [mockEvent]);
      }
    };
    const findStub = sinon.stub(EventModel, 'find').callsFake((query, projection) => {
      expect(query).to.not.have.property('complete');
      return chain4;
    });

    sinon.stub(EventModel, 'populate').callsFake((docs, paths, cb) => {
      setImmediate(() => cb(null, docs));
    });

    request(app)
      .get('/api/events')
      .query({ state: 'all' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function (res) {
        should.exist(res.body);
        res.body.should.be.an('array');
        expect(findStub.calledOnce).to.be.true;
      })
      .end(done);
  });

  it("should read event by id", function (done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    const eventId = 1;
    const mockEvent = new EventModel({
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
      .query({ state: 'all' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should fail to read event by id if event does not exist", function (done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    const eventId = 1;
    const mockEvent = new EventModel({
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
      .query({ state: 'all' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(404)
      .end(done);
  });

  it("should read teams page in event", function (done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    const eventId = 1;
    const mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      teamIds: {
        toObject: function () {
          return [1];
        }
      }
    });

    sinon.mock(EventModel).expects('findById').twice()
      .onFirstCall().yieldsAsync(null, mockEvent)
      .onSecondCall().resolves(mockEvent);

    const mockTeam = new TeamModel({
      _id: 1,
      name: 'Mock Team'
    });

    const mockQuery = {
      sort: sinon.stub().returnsThis(),
      populate: sinon.stub().returnsThis(),
      limit: sinon.stub().returnsThis(),
      skip: sinon.stub().resolves([mockTeam])
    };

    TeamModel.find.restore();
    sinon.stub(TeamModel, 'find').returns(mockQuery);
    sinon.stub(TeamModel, 'countDocuments').resolves(1);

    request(app)
      .get('/api/events/1/teams?page=0')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should read users in event", function (done) {
    mockTokenWithPermission('READ_EVENT_ALL');

    const eventId = 1;
    const mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    const eventMock = sinon.mock(EventModel);

    eventMock.expects('findById')
      .withArgs("1")
      .yields(null, mockEvent);

    eventMock.expects('findById')
      .chain('populate')
      .withArgs({ path: 'teamIds', populate: { path: 'userIds' } })
      .chain('exec')
      .yields(null, mockEvent);

    request(app)
      .get('/api/events/1/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should read users in event with team access", function (done) {
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
      .query({ populate: 'users' })
      .expect(200)
      .end(done);
  });

  it("reads teams in event with team access", async function () {

    mockTokenWithPermission('');

    const eventId = 1;
    const mockTeam = new TeamModel({
      _id: mongoose.Types.ObjectId(),
      userIds: [userId],
      acl: {}
    });
    const mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event 123',
      teamIds: {
        toObject: function () {
          return [mockTeam._id];
        }
      },
      acl: {
        1: 'NONE'
      }
    });

    sinon.mock(EventModel).expects('findById').twice()
      .onFirstCall().yieldsAsync(null, mockEvent)
      .onSecondCall().resolves(mockEvent);

    const mockQuery = {
      sort: sinon.stub().returnsThis(),
      populate: sinon.stub().returnsThis(),
      limit: sinon.stub().returnsThis(),
      skip: sinon.stub().resolves([mockTeam])
    };

    TeamModel.find.restore();
    sinon.stub(TeamModel, 'find').returns(mockQuery);
    sinon.stub(TeamModel, 'countDocuments').resolves(1);

    sinon.mock(eventPermissions)
      .expects('authorizeEventAccess')
      .withArgs(mockEvent, sinon.match.has('_id', userId), MageEventPermission.READ_EVENT_ALL, EventAccessType.Read)
      .resolves(null)

    const res = await request(app)
      .get('/api/events/1/teams?page=0')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .query({ populate: 'users' });

    expect(res.status).to.equal(200)
  });
});