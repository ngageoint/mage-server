'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('chai').should();
require('sinon-mongoose');

require('../../lib/models/team');
const TeamModel = mongoose.model('Team');

describe("team read tests", function () {

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

  it("should read teams", function (done) {
    mockTokenWithPermission('READ_TEAM');

    const teamId = 1;
    const mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team'
    });
    sinon.mock(TeamModel)
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

  it("should filter read teams", function (done) {
    mockTokenWithPermission('');

    const teamId = 1;
    const acl = {};
    acl[userId.toString()] = 'GUEST';
    const mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      acl: acl
    });

    const aclOwner = {};
    aclOwner['acl.' + userId.toString()] = 'OWNER';
    const aclManager = {};
    aclManager['acl.' + userId.toString()] = 'MANAGER';
    const aclGuest = {};
    aclGuest['acl.' + userId.toString()] = 'GUEST';

    sinon.mock(TeamModel)
      .expects('find')
      .withArgs({ $or: [{ userIds: { $in: [userId] } }, aclOwner, aclManager, aclGuest] })
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
