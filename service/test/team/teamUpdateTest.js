'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('sinon-mongoose');

require('../../lib/models/team');
const TeamModel = mongoose.model('Team');

describe("team update tests", function () {

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

  afterEach(function () {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission]));
  }

  it("should update team", function (done) {
    mockTokenWithPermission('UPDATE_TEAM');

    const teamId = mongoose.Types.ObjectId();
    const eventId = 1;
    const mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      teamEventId: eventId
    });

    sinon.mock(TeamModel)
      .expects('findOne').withArgs({ _id: teamId.toString() })
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

  it("should update team with acl access", function (done) {
    mockTokenWithPermission('');

    const teamId = mongoose.Types.ObjectId();
    const eventId = 1;
    const acl = {};
    acl[userId.toString()] = 'MANAGER';
    const mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      teamEventId: eventId,
      acl: acl
    });

    sinon.mock(TeamModel)
      .expects('findOne').withArgs({ _id: teamId.toString() })
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

  it("should reject update team without acl access", function (done) {
    mockTokenWithPermission('');

    const teamId = mongoose.Types.ObjectId();
    const eventId = 1;
    const acl = {};
    acl[userId.toString()] = 'GUEST';
    const mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      teamEventId: eventId,
      acl: acl
    });

    sinon.mock(TeamModel)
      .expects('findOne').withArgs({ _id: teamId.toString() })
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

  it("should update user in acl for team", function (done) {
    mockTokenWithPermission('');
    const aclUserId = mongoose.Types.ObjectId();

    const teamId = mongoose.Types.ObjectId();
    const acl = {};
    acl[userId.toString()] = 'MANAGER';
    const mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: acl
    });
    sinon.mock(TeamModel)
      .expects('findOne')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeam);

    const update = {};
    update['acl.' + aclUserId.toString()] = 'OWNER';
    sinon.mock(TeamModel)
      .expects('findOneAndUpdate')
      .withArgs({ _id: teamId }, update)
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

  it("should delete user in acl for team", function (done) {
    mockTokenWithPermission('');
    const aclUserId = mongoose.Types.ObjectId();

    const teamId = mongoose.Types.ObjectId();
    const acl = {};
    acl[userId.toString()] = 'MANAGER';
    const mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: acl
    });
    sinon.mock(TeamModel)
      .expects('findOne')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeam);

    const args = { $unset: {} };
    args.$unset['acl.' + aclUserId.toString()] = true;
    sinon.mock(TeamModel)
      .expects('findOneAndUpdate')
      .withArgs({ _id: teamId }, args)
      .yields(null, mockTeam);

    request(app)
      .delete('/api/teams/' + teamId + '/acl/' + aclUserId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send()
      .expect(200)
      .end(done);
  });

  it("should reject update user in acl with invalid userId", function (done) {
    mockTokenWithPermission('');
    const aclUserId = mongoose.Types.ObjectId();

    const teamId = mongoose.Types.ObjectId();
    const acl = {};
    acl[userId.toString()] = 'MANAGER';
    const mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: acl
    });
    sinon.mock(TeamModel)
      .expects('findOne')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeam);

    const update = {};
    update['acl.' + aclUserId.toString()] = 'MANAGER';
    sinon.mock(TeamModel)
      .expects('findOneAndUpdate')
      .withArgs({ _id: teamId }, update)
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

  it("should reject update user in acl with invalid role", function (done) {
    mockTokenWithPermission('');
    const aclUserId = mongoose.Types.ObjectId();

    const teamId = mongoose.Types.ObjectId();
    const acl = {};
    acl[userId.toString()] = 'MANAGER';
    const mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      acl: acl
    });
    sinon.mock(TeamModel)
      .expects('findOne')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeam);

    const update = {};
    update['acl.' + aclUserId.toString()] = 'MANAGER';
    sinon.mock(TeamModel)
      .expects('findOneAndUpdate')
      .withArgs({ _id: teamId }, update)
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
