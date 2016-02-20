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

describe("event update tests", function() {

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

  it("should add team to event", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var teamId = mongoose.Types.ObjectId();
    var mockTeams = [{
      id: teamId,
      name: 'Mock Team'
    }];

    sandbox.mock(TeamModel)
      .expects('find')
      .withArgs({ _id: { $in: [teamId.toString()] }})
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeams);

    sandbox.mock(EventModel)
      .expects('findByIdAndUpdate')
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        teamIds: [teamId.toString()]
      })
      .expect(200)
      .end(done);
  });

  it("should not add team that belongs to another event", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var teamId = mongoose.Types.ObjectId();
    var mockTeams = [{
      id: mongoose.Types.ObjectId(),
      name: 'Mock Team',
      teamEventId: 2
    }];

    sandbox.mock(TeamModel)
      .expects('find')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeams);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        teamIds: [teamId.toString()]
      })
      .expect(405)
      .expect(function(res) {
        res.text.should.equal("Cannot add a team that belongs specifically to another event");
      })
      .end(done);
  });
});
