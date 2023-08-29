'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , mockfs = require('mock-fs')
  , createToken = require('../mockToken')
  , CounterModel = require('../../lib/models/counter')
  , IconModel = require('../../lib/models/icon')
  , TeamModel =  require('../../lib/models/team')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('sinon-mongoose');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

describe("event create tests", function () {

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

  this.timeout(300000);

  afterEach(function () {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();

  it("should create event", function (done) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, ['CREATE_EVENT']));

    const eventId = 1;
    sinon.mock(CounterModel)
      .expects('getNext')
      .resolves(eventId);

    const mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    const eventAcl = {};
    eventAcl[userId.toString()] = 'OWNER';
    sinon.mock(EventModel)
      .expects('create')
      .withArgs(sinon.match.has('acl', eventAcl).and(sinon.match.has('_id', eventId)))
      .yields(null, mockEvent);

    sinon.mock(mongoose.connection.db)
      .expects('createCollection')
      .resolves(null);

    const teamId = mongoose.Types.ObjectId();
    const mockTeam = {
      _id: teamId,
      name: 'Mock Team',
      teamEventId: eventId
    };

    const teamAcl = {};
    teamAcl[userId.toString()] = 'OWNER';
    sinon.mock(TeamModel)
      .expects('createTeam')
      .yields(null, mockTeam);

    sinon.mock(TeamModel)
      .expects('getTeamById')
      .yields(null, [mockTeam]);

    mockEvent.teamIds = [teamId];
    sinon.mock(EventModel)
      .expects('findByIdAndUpdate').withArgs(eventId)
      .yields(null, mockEvent);

    const defaultIcon = require('../../lib/api/icon').defaultIconPath;
    const fs = {
      '/var/lib/mage': {}
    };
    fs[defaultIcon] = new Buffer([8, 6, 7, 5, 3, 0, 9]);
    mockfs(fs);

    sinon.mock(IconModel)
      .expects('create')
      .yields(null);

    request(app)
      .post('/api/events')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        form: {
          fields: [{
            name: 'timestamp',
            required: true
          }, {
            name: 'geometry',
            required: true
          }, {
            name: 'type',
            required: true
          }]
        }
      })
      .expect(201)
      .end(function (err) {
        mockfs.restore();
        done(err);
      });
  });

  it("should reject event with no name", function (done) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, ['CREATE_EVENT']));

    const eventId = 1;
    sinon.mock(CounterModel)
      .expects('getNext')
      .resolves(eventId);

    const mockEvent = new EventModel({
      _id: eventId
    });
    sinon.mock(EventModel.collection)
      .expects('insert')
      .yields(null, mockEvent);

    request(app)
      .post('/api/events')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        form: {
          fields: [{
            name: 'timestamp',
            required: true
          }, {
            name: 'geometry',
            required: true
          }, {
            name: 'type',
            required: true
          }]
        }
      })
      .expect(400)
      .expect(function (res) {
        let error = res.text;
        should.exist(error);
        error.should.be.a('string');
        error = JSON.parse(error);
        error.should.have.property('message').that.contains("Event validation failed");
        const errors = error.errors;
        should.exist(errors.name);
        errors.name.should.have.property('path').that.equals('name');
        errors.name.should.have.property('message').that.equals('Path `name` is required.');

      })
      .end(done);
  });

  it("should reject event with duplicate name", async function() {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, ['CREATE_EVENT']));

    const eventId = 1;
    sinon.mock(CounterModel)
      .expects('getNext')
      .resolves(eventId);

    const uniqueError = new Error('E11000 duplicate key error collection: magedb.events index: name_1 dup key: { : "Foo" }');
    uniqueError.name = 'MongoError';
    uniqueError.code = 11000;

    sinon.mock(EventModel.collection)
      .expects('indexInformation')
      .yields(null, {
        name_1: [['name', 1]]
      });

    sinon.mock(EventModel.collection)
      .expects('insertOne')
      .yields(uniqueError, null);

    const res = await request(app)
      .post('/api/events')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Test',
        form: {
          fields: [{
            name: 'timestamp',
            required: true
          }, {
            name: 'geometry',
            required: true
          }, {
            name: 'type',
            required: true
          }]
        }
      })

    res.status.should.equal(400)
    res.body.should.exist
    res.body.message.should.equals('Validation failed');
    res.body.should.have.property('errors').that.is.an('object');
    res.body.errors.should.have.property('name').that.is.an('object');
    res.body.errors.name.should.have.property('message').that.equals('Duplicate event name');
  });
});
