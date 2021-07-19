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

  it("should create team", function(done) {
    mockTokenWithPermission('CREATE_TEAM');

    var teamId = mongoose.Types.ObjectId();
    var eventId = 1;
    var mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      teamEventId: eventId
    });

    var acl = {};
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
