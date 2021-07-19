var request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("team update tests", function() {

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
  
  afterEach(function() {
    sinon.restore();
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
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

    sinon.mock(TeamModel)
      .expects('findOne').withArgs({_id: teamId.toString()})
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, mockTeam);

    sinon.mock(TeamModel)
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
    var acl = {};
    acl[userId.toString()] = 'MANAGER';
    var mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      teamEventId: eventId,
      acl: acl
    });

    sinon.mock(TeamModel)
      .expects('findOne').withArgs({_id: teamId.toString()})
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, mockTeam);

    sinon.mock(TeamModel)
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
    var acl = {};
    acl[userId.toString()] = 'GUEST';
    var mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      teamEventId: eventId,
      acl: acl
    });

    sinon.mock(TeamModel)
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

  it("should update user in acl for team", function(done) {
    mockTokenWithPermission('');
    var aclUserId = mongoose.Types.ObjectId();

    var teamId = mongoose.Types.ObjectId();
    var acl = {};
    acl[userId.toString()] = 'MANAGER';
    var mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: acl
    });
    sinon.mock(TeamModel)
      .expects('findOne')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeam);

    var update = {};
    update['acl.' + aclUserId.toString()] = 'OWNER';
    sinon.mock(TeamModel)
      .expects('findOneAndUpdate')
      .withArgs({_id: teamId}, update)
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

    var teamId = mongoose.Types.ObjectId();
    var acl = {};
    acl[userId.toString()] = 'MANAGER';
    var mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: acl
    });
    sinon.mock(TeamModel)
      .expects('findOne')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeam);

    var args = { $unset: {} };
    args.$unset['acl.' + aclUserId.toString()] = true;
    sinon.mock(TeamModel)
      .expects('findOneAndUpdate')
      .withArgs({_id: teamId}, args)
      .yields(null, mockTeam);

    request(app)
      .delete('/api/teams/' + teamId + '/acl/' + aclUserId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send()
      .expect(200)
      .end(done);
  });

  it("should reject update user in acl with invalid userId", function(done) {
    mockTokenWithPermission('');
    var aclUserId = mongoose.Types.ObjectId();

    var teamId = mongoose.Types.ObjectId();
    var acl = {};
    acl[userId.toString()] = 'MANAGER';
    var mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: acl
    });
    sinon.mock(TeamModel)
      .expects('findOne')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeam);

    var update = {};
    update['acl.' + aclUserId.toString()] = 'MANAGER';
    sinon.mock(TeamModel)
      .expects('findOneAndUpdate')
      .withArgs({_id: teamId}, update)
      .yields(null, mockTeam);

    request(app)
      .put('/api/teams/' + teamId + '/acl/1')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        role: 'MANAGER'
      })
      .expect(400)
      .end(done);
  });

  it("should reject update user in acl with invalid role", function(done) {
    mockTokenWithPermission('');
    var aclUserId = mongoose.Types.ObjectId();

    var teamId = mongoose.Types.ObjectId();
    var acl = {};
    acl[userId.toString()] = 'MANAGER';
    var mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: acl
    });
    sinon.mock(TeamModel)
      .expects('findOne')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeam);

    var update = {};
    update['acl.' + aclUserId.toString()] = 'MANAGER';
    sinon.mock(TeamModel)
      .expects('findOneAndUpdate')
      .withArgs({_id: teamId}, update)
      .yields(null, mockTeam);

    request(app)
      .put('/api/teams/' + teamId + '/acl/' + aclUserId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        role: 'NONE'
      })
      .expect(400)
      .end(done);
  });
});
