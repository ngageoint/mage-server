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

describe("team create tests", function() {

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

    app = require('../../lib/express').app;
  });

  afterEach(function() {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission]));
  }

  it("should create team", function(done) {
    mockTokenWithPermission('CREATE_TEAM');

    const teamId = mongoose.Types.ObjectId();
    const eventId = 1;
    const mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      teamEventId: eventId
    });

    const acl = {};
    acl[userId.toString()] = 'OWNER';
    sinon.mock(TeamModel)
      .expects('create')
      .withArgs(sinon.match.has('acl', acl))
      .yields(null, mockTeam);

    request(app)
      .post('/api/teams/')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Team'
      })
      .expect(200)
      .end(done);
  });

  it("should reject create team w/o name", function(done) {
    mockTokenWithPermission('CREATE_TEAM');

    request(app)
      .post('/api/teams/')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
      })
      .expect(400)
      .end(done);
  });
});
