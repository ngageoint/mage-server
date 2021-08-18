var request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("team read tests", function() {

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

  it("should read teams", function(done) {
    mockTokenWithPermission('READ_TEAM');

    var teamId = 1;
    var mockTeam = new TeamModel({
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

  it("should filter read teams", function(done) {
    mockTokenWithPermission('');

    var teamId = 1;
    var acl = {};
    acl[userId.toString()] = 'GUEST';
    var mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      acl: acl
    });

    var aclOwner = {};
    aclOwner['acl.' + userId.toString()] = 'OWNER';
    var aclManager = {};
    aclManager['acl.' + userId.toString()] = 'MANAGER';
    var aclGuest= {};
    aclGuest['acl.' + userId.toString()] = 'GUEST';

    sinon.mock(TeamModel)
      .expects('find')
      .withArgs({$or: [{ userIds: { $in: [userId] } }, aclOwner, aclManager, aclGuest]})
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
