var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , mongoose = require('mongoose');

require('../../models/token');
var TokenModel = mongoose.model('Token');

require('../../models/role');
var RoleModel = mongoose.model('Role');

require('../../models/user');
var UserModel = mongoose.model('User');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;

require('sinon-mongoose');

describe("user create tests", function() {

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

  it('should create user as admin', function(done) {
    mockTokenWithPermission('CREATE_USER');

    var id = mongoose.Types.ObjectId();
    var roleId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'password',
      passwordconfirm: 'password',
      roleId: roleId
    });

    sandbox.mock(mockUser)
      .expects('populate')
      .withArgs('roleId')
      .yields(null, mockUser);

    sandbox.mock(UserModel)
      .expects('create')
      .yields(null, mockUser);

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password',
        roleId: roleId
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      })
      .end(done);
  });

  it('should create user', function(done) {
    mockTokenWithPermission('NO_PERMISSIONS');

    sandbox.mock(RoleModel)
      .expects('findOne')
      .withArgs({ name: 'USER_ROLE' })
      .yields(null, new RoleModel({
        permissions: ['SOME_PERMISSIONS']
      }));

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'password',
      passwordconfirm: 'password'
    });

    sandbox.mock(mockUser)
      .expects('populate')
      .withArgs('roleId')
      .yields(null, mockUser);

    sandbox.mock(UserModel)
      .expects('create')
      .yields(null, mockUser);

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      })
      .end(done);
  });

  it('should create recent event for user', function(done) {
    mockTokenWithPermission('READ_USER');

    sandbox.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, new UserModel({
        _id: userId,
        username: 'test'
      }));

    var mockEvent = new EventModel({
      _id: 1,
      name: 'Event 1',
      teamIds: [new TeamModel({
        name: 'Team 1',
        userIds: [userId]
      })]
    });

    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test'
    });

    sandbox.mock(UserModel)
      .expects('findByIdAndUpdate')
      .withArgs(userId, {recentEventIds: [1]})
      .yields(null, mockUser);

    request(app)
      .post('/api/users/' + userId + '/events/1/recent')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(userId.toString());
      })
      .end(done);
  });

});
