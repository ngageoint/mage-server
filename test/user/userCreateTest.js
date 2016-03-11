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
      .twice()
      .withArgs('roleId')
      .yields(null, mockUser);

    sandbox.mock(UserModel)
      .expects('create')
      .yields(null, mockUser);

    sandbox.mock(mockUser)
      .expects('save')
      .yields(null, mockUser);

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
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

  it('should fail to create user as admin w/o roleId', function(done) {
    mockTokenWithPermission('CREATE_USER');

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('roleId is a required field');
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
      password: 'passwordpassword',
      passwordconfirm: 'passwordpassword'
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
        phone: '000-000-0000',
        email: 'test@test.com',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
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

  it('should fail to create user w/o username', function(done) {
    mockTokenWithPermission('NO_PERMISSIONS');

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        displayName: 'test',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("Cannot create user, invalid parameters.  'username' parameter is required");
      })
      .end(done);
  });

  it('should fail to create user w/o displayName', function(done) {
    mockTokenWithPermission('NO_PERMISSIONS');

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("Cannot create user, invalid parameters.  'displayName' parameter is required");
      })
      .end(done);
  });

  it('should fail to create user with invalid email', function(done) {
    mockTokenWithPermission('NO_PERMISSIONS');

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'notvalid',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('Please enter a valid email address');
      })
      .end(done);
  });

  it('should fail to create user w/o password', function(done) {
    mockTokenWithPermission('NO_PERMISSIONS');

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        passwordconfirm: 'passwordpassword'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("Cannot create user, invalid parameters.  'password' parameter is required");
      })
      .end(done);
  });

  it('should fail to create user w/o passwordconfirm', function(done) {
    mockTokenWithPermission('NO_PERMISSIONS');

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'passwordpassword'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("Cannot create user, invalid parameters.  'passwordconfirm' parameter is required");
      })
      .end(done);
  });

  it('should fail to create user when passsord and passwordconfirm do not match', function(done) {
    mockTokenWithPermission('NO_PERMISSIONS');

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'passwordpassword',
        passwordconfirm: 'passwordconfirmpasswordconfirm'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('passwords do not match');
      })
      .end(done);
  });

  it('should fail to create user when passsord does not meet complexity', function(done) {
    mockTokenWithPermission('NO_PERMISSIONS');

    sandbox.mock(RoleModel)
      .expects('findOne')
      .withArgs({ name: 'USER_ROLE' })
      .yields(null, new RoleModel({
        permissions: ['SOME_PERMISSIONS']
      }));

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
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('password does not meet minimum length requirement of 14 characters');
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
