'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , EventModel = require('../../lib/models/event')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('sinon-mongoose');

require('../../lib/models/team');
const TeamModel = mongoose.model('Team');

describe("team delete tests", function () {

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

  it("should delete team", function (done) {
    mockTokenWithPermission('DELETE_TEAM');

    const teamId = mongoose.Types.ObjectId();
    const eventId = 1;
    const mockTeam = new TeamModel({
      id: teamId,
      name: 'Team 1',
      teamEventId: eventId
    });

    sinon.mock(TeamModel)
      .expects('findOne').withArgs({ _id: teamId.toString() })
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, mockTeam);

    sinon.mock(EventModel)
      .expects('getById')
      .yields(null, {
        name: 'Mock Event'
      });

    sinon.mock(mockTeam)
      .expects('remove')
      .yields(null);

    request(app)
      .delete('/api/teams/' + teamId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should delete team with acl delete", function (done) {
    mockTokenWithPermission('');

    const teamId = mongoose.Types.ObjectId();
    const eventId = 1;

    const acl = {};
    acl[userId.toString()] = 'OWNER';
    const mockTeam = new TeamModel({
      id: teamId,
      teamEventId: eventId,
      name: 'Mock Team',
      acl: acl
    });

    sinon.mock(TeamModel)
      .expects('findOne').withArgs({ _id: teamId.toString() })
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, mockTeam);

    sinon.mock(EventModel)
      .expects('getById')
      .yields(null, {
        name: 'Mock Event'
      });

    sinon.mock(mockTeam)
      .expects('remove')
      .yields(null);

    request(app)
      .delete('/api/teams/' + teamId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  it("should fail to delete team with no acl delete", function (done) {
    mockTokenWithPermission('');

    const teamId = mongoose.Types.ObjectId();
    const eventId = 1;

    const acl = {};
    acl[userId.toString()] = 'MANAGER';
    const mockTeam = new TeamModel({
      id: teamId,
      teamEventId: eventId,
      name: 'Mock Team',
      acl: acl
    });

    sinon.mock(TeamModel)
      .expects('findOne').withArgs({ _id: teamId.toString() })
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, mockTeam);

    request(app)
      .delete('/api/teams/' + teamId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(403)
      .end(done);
  });

  it("should not delete team specifically for event", function (done) {
    mockTokenWithPermission('DELETE_TEAM');

    const teamId = mongoose.Types.ObjectId();
    const eventId = 1;
    const mockTeam = new TeamModel({
      id: teamId,
      name: 'Team 1',
      teamEventId: eventId
    });

    sinon.mock(TeamModel)
      .expects('findOne').withArgs({ _id: teamId.toString() })
      .chain('populate').withArgs('userIds')
      .chain('exec')
      .yields(null, mockTeam);

    sinon.mock(EventModel)
      .expects('getById')
      .yields(null, {
        name: 'Mock Event'
      });

    request(app)
      .delete('/api/teams/' + teamId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(405)
      .expect(function (res) {
        res.text.should.equal("Cannot delete an events team, event 'Mock Event' still exists.");
      })
      .end(done);
  });
});
