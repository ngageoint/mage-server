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

  const userId = new mongoose.Types.ObjectId();
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
      .resolves([mockTeam]);

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
      .resolves([mockTeam]);

    request(app)
      .get('/api/teams')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .end(done);
  });

  function mockFindTeam(teamId, { populate }) {
    const mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team'
    });
    let mock = sinon.mock(TeamModel)
      .expects('findOne').withArgs({ _id: teamId.toString() });
    if (populate) {
      mock = mock.chain('populate').withArgs('userIds');
    }
    mock.chain('exec').resolves(mockTeam);
  }

  function getTeam(teamId, query) {
    return request(app)
      .get('/api/teams/' + teamId.toString())
      .query(query)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345');
  }

  it("should read team", function (done) {
    mockTokenWithPermission('READ_TEAM');
    const teamId = new mongoose.Types.ObjectId();
    mockFindTeam(teamId, { populate: true });

    getTeam(teamId).expect(200).end(done);
  });

  it("should read team without populating users", function (done) {
    mockTokenWithPermission('READ_TEAM');
    const teamId = new mongoose.Types.ObjectId();
    mockFindTeam(teamId, { populate: false });

    getTeam(teamId, 'populate=false').expect(200).end(done);
  });

  it("should not build team query from request query parameters", function (done) {
    mockTokenWithPermission('READ_TEAM');
    const teamId = new mongoose.Types.ObjectId();
    mockFindTeam(teamId, { populate: true });

    getTeam(teamId, 'access[user][_id]=1&access[permission]=read').expect(200).end(done);
  });
});
