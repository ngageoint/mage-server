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

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

describe("team read tests", function() {

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

  it("should read teams", function(done) {
    mockTokenWithPermission('READ_TEAM');

    var teamId = 1;
    var mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team'
    });
    sandbox.mock(TeamModel)
      .expects('find')
      .withArgs({})
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, [mockTeam]);

    request(app)
      .get('/api/teams')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should filter read teams", function(done) {
    mockTokenWithPermission('');

    var teamId = 1;
    var mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: [{
        userId: userId,
        role: 'GUEST'
      }]
    });
    sandbox.mock(TeamModel)
      .expects('find')
      .withArgs({$or: [{ userIds: { $in: [userId] } }, { acl: { $elemMatch: { role: "OWNER", userId: userId } } }, { acl: { $elemMatch: { role: "MANAGER", userId: userId } } }, { acl: { $elemMatch: { role: "GUEST", userId: userId } } }]})
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, [mockTeam]);

    request(app)
      .get('/api/teams')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });
});
