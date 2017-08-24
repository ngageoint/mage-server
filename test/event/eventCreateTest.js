var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , path = require('path')
  , mockfs = require('mock-fs')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../models/counter');
var CounterModel = mongoose.model('Counter');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

require('../../models/icon');
var IconModel = mongoose.model('Icon');

describe("event create tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  var userId = mongoose.Types.ObjectId();

  it("should create event", function(done) {
    sandbox.mock(TokenModel)
      .expects('findOne').atLeast(1)
      .withArgs({token: "12345"})
      .chain('populate').atLeast(1)
      .chain('exec').atLeast(1)
      .yields(null, MockToken(userId, ['CREATE_EVENT']));

    var eventId = 1;
    sandbox.mock(CounterModel)
      .expects('findOneAndUpdate')
      .yields(null, { sequence: eventId });

    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });

    var eventAcl = {};
    eventAcl[userId.toString()] = 'OWNER';
    sandbox.mock(EventModel)
      .expects('create')
      .withArgs(sinon.match.has('acl', eventAcl).and(sinon.match.has('_id', eventId)))
      .yields(null, mockEvent);

    mongoose.connection.db = sandbox.stub();
    mongoose.connection.db.createCollection = function() {};
    sandbox.mock(mongoose.connection.db)
      .expects('createCollection')
      .yields(null);

    var teamId = mongoose.Types.ObjectId();
    var mockTeam = {
      _id: teamId,
      name: 'Mock Team',
      teamEventId: eventId
    };

    var teamAcl = {};
    teamAcl[userId.toString()] = 'OWNER';
    sandbox.mock(TeamModel)
      .expects('create')
      .withArgs(sinon.match.has('acl', teamAcl).and(sinon.match.has('teamEventId', eventId)))
      .yields(null, mockTeam);

    sandbox.mock(TeamModel)
      .expects('find')
      .withArgs({ _id: { $in: [teamId] } })
      .chain('populate')
      .chain('exec')
      .yields(null, [mockTeam]);

    mockEvent.teamIds = [teamId];
    sandbox.mock(EventModel)
      .expects('findByIdAndUpdate').withArgs(eventId)
      .yields(null, mockEvent);

    var defaultIcon = path.join(path.dirname(require.main.filename), '/public/img/default-icon.png');
    var fs = {
      '/var/lib/mage': {}
    };
    fs[defaultIcon] = new Buffer([8, 6, 7, 5, 3, 0, 9]);
    mockfs(fs);

    sandbox.mock(IconModel)
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
    sandbox.mock(TokenModel)
      .expects('findOne').atLeast(1)
      .withArgs({token: "12345"})
      .chain('populate').atLeast(1)
      .chain('exec').atLeast(1)
      .yields(null, MockToken(userId, ['CREATE_EVENT']));

    var eventId = 1;
    sandbox.mock(CounterModel)
      .expects('findOneAndUpdate')
      .yields(null, { sequence: eventId });

    var mockEvent = new EventModel({
      _id: eventId
    });
    sandbox.mock(EventModel.collection)
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
        var error = res.text;
        should.exist(error);
        error.should.be.a('string');
        error = JSON.parse(error);
        error.should.have.property('message').that.contains("Event validation failed");
        var errors = error.errors;
        should.exist(errors.name);
        errors.name.should.have.property('path').that.equals('name');
        errors.name.should.have.property('message').that.equals('Path `name` is required.');

      })
      .end(done);
  });
});
