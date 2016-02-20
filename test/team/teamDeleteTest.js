var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

describe("team delete tests", function() {

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

  it("should not delete team specifically for event", function(done) {
    mockTokenWithPermission('DELETE_TEAM');

    var teamId = mongoose.Types.ObjectId();
    var eventId = 1;
    var mockTeam = new TeamModel({
      id: teamId,
      name: 'Team 1',
      teamEventId: eventId
    });

    sandbox.mock(TeamModel)
      .expects('findById').withArgs(teamId.toString())
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, mockTeam);

    sandbox.mock(EventModel)
      .expects('findById').withArgs(eventId)
      .yields(null, new EventModel({
        name: 'Mock Event'
      }));

    request(app)
      .delete('/api/teams/' + teamId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(405)
      .expect(function(res) {
        res.text.should.equal("Cannot delete an events team, event 'Mock Event' still exists.");
      })
      .end(done);
  });
});
