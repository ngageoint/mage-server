var request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

describe("team update tests", function() {

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

  it("should update team", function(done) {
    mockTokenWithPermission('UPDATE_TEAM');

    var teamId = mongoose.Types.ObjectId();
    var eventId = 1;
    var mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      teamEventId: eventId
    });

    sandbox.mock(TeamModel)
      .expects('findOne').withArgs({_id: teamId.toString()})
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, mockTeam);

    sandbox.mock(TeamModel)
      .expects('findByIdAndUpdate')
      .yields(null, mockTeam);

    request(app)
      .put('/api/teams/' + teamId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Team'
      })
      .expect(200)
      .end(done);
  });

  it("should update team with acl access", function(done) {
    mockTokenWithPermission('');

    var teamId = mongoose.Types.ObjectId();
    var eventId = 1;
    var mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      teamEventId: eventId,
      acl: [{
        role: 'MANAGER',
        userId: userId
      }]
    });

    sandbox.mock(TeamModel)
      .expects('findOne').withArgs({_id: teamId.toString()})
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, mockTeam);

    sandbox.mock(TeamModel)
      .expects('findByIdAndUpdate')
      .yields(null, mockTeam);

    request(app)
      .put('/api/teams/' + teamId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Team'
      })
      .expect(200)
      .end(done);
  });

  it("should reject update team without acl access", function(done) {
    mockTokenWithPermission('');

    var teamId = mongoose.Types.ObjectId();
    var eventId = 1;
    var mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      teamEventId: eventId,
      acl: [{
        role: 'GUEST',
        userId: userId
      }]
    });

    sandbox.mock(TeamModel)
      .expects('findOne').withArgs({_id: teamId.toString()})
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, mockTeam);

    request(app)
      .put('/api/teams/' + teamId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Team'
      })
      .expect(403)
      .end(done);
  });

  it("should add user to acl in team", function(done) {
    mockTokenWithPermission('');
    var aclUserId = mongoose.Types.ObjectId();

    var teamId = 1;
    var mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: [{
        role: 'MANAGER',
        userId: userId
      }]
    });
    sandbox.mock(TeamModel)
      .expects('findOne')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeam);

    sandbox.mock(mockTeam)
      .expects('save')
      .yields(null, mockTeam);

    request(app)
      .post('/api/teams/' + teamId + '/acl/')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        userId: aclUserId.toString(),
        role: 'MANAGER'
      })
      .expect(200)
      .end(done);
  });

  it("should update user in acl for team", function(done) {
    mockTokenWithPermission('');
    var aclUserId = mongoose.Types.ObjectId();

    var teamId = 1;
    var mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: [{
        role: 'MANAGER',
        userId: userId
      }]
    });
    sandbox.mock(TeamModel)
      .expects('findOne')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeam);

    sandbox.mock(mockTeam)
      .expects('save')
      .yields(null, mockTeam);

    request(app)
      .put('/api/teams/' + teamId + '/acl/' + aclUserId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        role: 'OWNER'
      })
      .expect(200)
      .end(done);
  });

  it("should delete user in acl for team", function(done) {
    mockTokenWithPermission('');
    var aclUserId = mongoose.Types.ObjectId();

    var teamId = 1;
    var mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: [{
        role: 'MANAGER',
        userId: userId
      }]
    });
    sandbox.mock(TeamModel)
      .expects('findOne')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeam);

    sandbox.mock(mockTeam)
      .expects('save')
      .yields(null, mockTeam);

    request(app)
      .delete('/api/teams/' + teamId + '/acl/' + aclUserId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send()
      .expect(200)
      .end(done);
  });
});
