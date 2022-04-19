var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , mockfs = require('mock-fs')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../models/counter');
var CounterModel = mongoose.model('Counter');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
const EventModel = mongoose.model('Event');

require('../../models/icon');
const IconModel = mongoose.model('Icon');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("event create tests", function() {

  let app;

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

    app = require('../../express');
  });

  this.timeout(300000);

  afterEach(function() {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();

  it("should create event", function(done) {
    sinon.mock(TokenModel)
      .expects('findOne').atLeast(1)
      .withArgs({token: "12345"})
      .chain('populate').atLeast(1)
      .chain('exec').atLeast(1)
      .yields(null, MockToken(userId, ['CREATE_EVENT']));

    const eventId = 1;
    sinon.mock(CounterModel)
      .expects('findOneAndUpdate')
      .chain('exec')
      .resolves({sequence: eventId });

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

    mongoose.connection.db = sinon.stub();
    mongoose.connection.db.createCollection = function() {};
    sinon.mock(mongoose.connection.db)
      .expects('createCollection')
      .yields(null);

    const teamId = mongoose.Types.ObjectId();
    const mockTeam = {
      _id: teamId,
      name: 'Mock Team',
      teamEventId: eventId
    };

    const teamAcl = {};
    teamAcl[userId.toString()] = 'OWNER';
    sinon.mock(TeamModel)
      .expects('create')
      .withArgs(sinon.match.has('acl', teamAcl).and(sinon.match.has('teamEventId', eventId)))
      .yields(null, mockTeam);

    sinon.mock(TeamModel)
      .expects('find')
      .withArgs({ _id: { $in: [teamId] } })
      .chain('populate')
      .chain('exec')
      .yields(null, [mockTeam]);

    mockEvent.teamIds = [teamId];
    sinon.mock(EventModel)
      .expects('findByIdAndUpdate').withArgs(eventId)
      .yields(null, mockEvent);

    const defaultIcon = require('../../api/icon').defaultIconPath;
    const fs = {
      '/var/lib/mage': {}
    };
    fs[defaultIcon] = new Buffer([8, 6, 7, 5, 3, 0, 9]);
    mockfs(fs);

    sinon.mock(IconModel)
      .expects('findOneAndUpdate')
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
          },{
            name: 'geometry',
            required: true
          },{
            name: 'type',
            required: true
          }]
        }
      })
      .expect(201)
      .end(function(err) {
        mockfs.restore();
        done(err);
      });
  });

  it("should reject event with no name", function(done) {
    sinon.mock(TokenModel)
      .expects('findOne').atLeast(1)
      .withArgs({token: "12345"})
      .chain('populate').atLeast(1)
      .chain('exec').atLeast(1)
      .yields(null, MockToken(userId, ['CREATE_EVENT']));

    const eventId = 1;
    sinon.mock(CounterModel)
      .expects('findOneAndUpdate')
      .chain('exec')
      .resolves({ sequence: eventId });

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
          },{
            name: 'geometry',
            required: true
          },{
            name: 'type',
            required: true
          }]
        }
      })
      .expect(400)
      .expect(function(res) {
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

  it("should reject event with duplicate name", function(done) {
    sinon.mock(TokenModel)
      .expects('findOne').atLeast(1)
      .withArgs({token: "12345"})
      .chain('populate').atLeast(1)
      .chain('exec').atLeast(1)
      .yields(null, MockToken(userId, ['CREATE_EVENT']));

    const eventId = 1;
    sinon.mock(CounterModel)
      .expects('findOneAndUpdate')
      .chain('exec')
      .resolves({ sequence: eventId });

    const uniqueError = new Error('E11000 duplicate key error collection: magedb.events index: name_1 dup key: { : "Foo" }');
    uniqueError.name = 'MongoError';
    uniqueError.code = 11000;

    sinon.mock(EventModel.collection)
      .expects('indexInformation')
      .yields(null, {
        name_1: [['name', 1 ]]
      });

    sinon.mock(EventModel.collection)
      .expects('insert')
      .yields(uniqueError, null);

    request(app)
      .post('/api/events')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Test',
        form: {
          fields: [{
            name: 'timestamp',
            required: true
          },{
            name: 'geometry',
            required: true
          },{
            name: 'type',
            required: true
          }]
        }
      })
      .expect(400)
      .expect(function(res) {
        should.exist(res.body);
        res.body.should.have.property('message').that.equals('Validation failed');
        res.body.should.have.property('errors').that.is.an('object');
        res.body.errors.should.have.property('name').that.is.an('object');
        res.body.errors.name.should.have.property('message').that.equals('Event with name "Test" already exists.');
      })
      .end(done);
  });
});
