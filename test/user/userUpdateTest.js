var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , expect = require('chai').expect
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , mongoose = require('mongoose');

require('../../models/token');
var TokenModel = mongoose.model('Token');

var User = require('../../models/user');
var UserModel = mongoose.model('User');

require('../../models/event');
var EventModel = mongoose.model('Event');

require('sinon-mongoose');

describe("user update tests", function() {

  afterEach(function() {
    sinon.restore();
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    var permissions = Array.isArray(permission) ? permission : [permission];
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, permissions));
  }

  it('should update myself', function(done) {
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    var token = {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function(field, callback) {
          callback(null, mockUser);
        }
      }
    };

    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);

    sinon.mock(mockUser)
      .expects('save')
      .yields(null, mockUser);

    sinon.mock(mockUser)
      .expects('populate')
      .yields(null, mockUser);

    request(app)
      .put('/api/users/myself')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(userId.toString());
      })
      .end(done);
  });

  it('should fail to update myself if passwords do not match', function(done) {
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      roleId: mongoose.Types.ObjectId(),
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(UserModel.prototype)
      .expects('validPassword')
      .yields(null, true);

    sinon.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

    request(app)
      .put('/api/users/myself/password')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        password: 'password',
        newPassword: 'password',
        newPasswordConfirm: 'passwordconfirm'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('passwords do not match');
      })
      .end(done);
  });

  it('should fail to update myself if passwords does not meet complexity', function(done) {
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      roleId: mongoose.Types.ObjectId(),
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(UserModel.prototype)
      .expects('validPassword')
      .yields(null, true);

    sinon.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

    request(app)
      .put('/api/users/myself/password')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        password: 'password',
        newPassword: 'password',
        newPasswordConfirm: 'password'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('password does not meet minimum length requirment of 14 characters');
      })
      .end(done);
  });

  it('should update user', function(done) {
    mockTokenWithPermission('UPDATE_USER');

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(mockUser)
      .expects('save')
      .yields(null, mockUser);

    sinon.mock(mockUser)
      .expects('populate')
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        active: true,
        roleId: mongoose.Types.ObjectId()
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

  it('should update user role with UPDATE_USER_ROLE', function(done) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, ['UPDATE_USER', 'UPDATE_USER_ROLE']));

    var id = mongoose.Types.ObjectId();
    var roleId = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(User)
      .expects('updateUser')
      .withArgs(sinon.match.has('roleId', roleId))
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        active: true,
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

  it('should update user password with UPDATE_USER_ROLE permission', function(done) {
    mockTokenWithPermission(['UPDATE_USER', 'UPDATE_USER_ROLE']);

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(User)
      .expects('updateUser')
      .withArgs(sinon.match.has('authentication', sinon.match.has('password', 'passwordpassword')))
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        active: true,
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

  it('should fail to update user password w/o UPDATE_USER_ROLE permission', function(done) {
    mockTokenWithPermission('UPDATE_USER');

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(User)
      .expects('updateUser')
      .withArgs(sinon.match.has('authentication', sinon.match.has('password', sinon.match.typeOf("undefined"))))
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        active: true,
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


  it('should fail to update user role w/o UPDATE_USER_ROLE', function(done) {
    mockTokenWithPermission('UPDATE_USER');

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(User)
      .expects('updateUser')
      .withArgs(sinon.match.has('roleId', undefined))
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        active: true,
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        roleId: mongoose.Types.ObjectId()
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

  it('should activate user', function(done) {
    mockTokenWithPermission('UPDATE_USER');

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(User)
      .expects('updateUser')
      .withArgs(sinon.match({active: true}))
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        active: 'true'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done);
  });

  it('should disable user', function(done) {
    mockTokenWithPermission('UPDATE_USER');

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(User)
      .expects('updateUser')
      .withArgs(sinon.match({enabled: false}))
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        enabled: 'false'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done);
  });

  it('should remove token if user is inactive', function(done) {
    mockTokenWithPermission('UPDATE_USER');

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: false,
      enabled: true,
      roleId: mongoose.Types.ObjectId(),
      authentication: {
        type: 'local'
      }
    });

    // mock variable used by mongoose to determine if this is a create or update
    mockUser.isNew = false;
    // mock mongoose populate call
    mockUser.populate = function(field, callback) {
      callback(null, mockUser);
    };

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(UserModel.collection)
      .expects('update')
      .yields(null, {});

    sinon.mock(UserModel.collection)
      .expects('findOne')
      .yields(null, null);

    const tokenStub = sinon.mock(TokenModel)
      .expects('remove')
      .withArgs(sinon.match({userId: id}))
      .yields(null);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        active: 'false'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function() {
        expect(tokenStub.called).to.be.true;
      })
      .end(done);
  });

  it('should remove token if user is disabled', function(done) {
    mockTokenWithPermission('UPDATE_USER');

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      enabled: true,
      roleId: mongoose.Types.ObjectId(),
      authentication: {
        type: 'local'
      }
    });

    // mock variable used by mongoose to determine if this is a create or update
    mockUser.isNew = false;
    // mock mongoose populate call
    mockUser.populate = function(field, callback) {
      callback(null, mockUser);
    };

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(UserModel.collection)
      .expects('update')
      .yields(null, {});

    sinon.mock(UserModel.collection)
      .expects('findOne')
      .yields(null, null);

    const tokenStub = sinon.mock(TokenModel)
      .expects('remove')
      .withArgs(sinon.match({userId: id}))
      .yields(null);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        enabled: 'false'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function() {
        expect(tokenStub.called).to.be.true;
      })
      .end(done);
  });

  it('should fail to update user if passwords dont match', function(done) {
    mockTokenWithPermission('UPDATE_USER');

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'confirm',
        roleId: mongoose.Types.ObjectId()
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('passwords do not match');
      })
      .end(done);
  });

  it('should fail to update user if password does not meet complexity', function(done) {
    mockTokenWithPermission('UPDATE_USER');

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password',
        roleId: mongoose.Types.ObjectId()
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('password does not meet minimum length requirment of 14 characters');
      })
      .end(done);
  });

  it('should update status for myself', function(done) {
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true
    });

    var token = {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function(field, callback) {
          callback(null, mockUser);
        }
      }
    };

    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);

    sinon.mock(mockUser)
      .expects('save')
      .yields(null, mockUser);

    sinon.mock(mockUser)
      .expects('populate')
      .yields(null, mockUser);

    request(app)
      .put('/api/users/myself/status')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        status: 'help'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        mockUser.should.have.property('status').that.equals('help');

        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(userId.toString());
      })
      .end(done);
  });

  it('should fail to update status for myself w/o status', function(done) {
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true
    });

    var token = {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function(field, callback) {
          callback(null, mockUser);
        }
      }
    };

    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);

    request(app)
      .put('/api/users/myself/status')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({})
      .expect(400)
      .expect(function(res) {
        res.text.should.equal("Missing required parameter 'status'");
      })
      .end(done);
  });

  it('should delete status for myself', function(done) {
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      status: 'help'
    });

    var token = {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function(field, callback) {
          callback(null, mockUser);
        }
      }
    };

    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);

    sinon.mock(mockUser)
      .expects('save')
      .yields(null, mockUser);

    sinon.mock(mockUser)
      .expects('populate')
      .yields(null, mockUser);

    request(app)
      .delete('/api/users/myself/status')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        status: 'help'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        mockUser.should.have.property('status').that.is.undefined;

        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(userId.toString());
      })
      .end(done);
  });

  it('should add recent event for admin user', function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    var mockEvent = new EventModel({
      _id: 1,
      name: 'Mock Event'
    });

    sinon.mock(EventModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockEvent)
      .onSecondCall()
      .yields(null, mockEvent);

    sinon.mock(UserModel)
      .expects('findByIdAndUpdate')
      .withArgs(userId, {recentEventIds: [1]}, {new: true})
      .yields(null, mockUser);

    request(app)
      .post('/api/users/' + userId.toString() + '/events/1/recent' )
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

  it('should limit recent events for acl user', function(done) {
    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      recentEventIds: [5,4,3,2,1],
      authentication: {
        type: 'local'
      }
    });

    var token = {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function(field, callback) {
          callback(null, mockUser);
        }
      }
    };

    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    var eventAcl = {};
    eventAcl[userId.toString()] = 'OWNER';
    var mockEvent = new EventModel({
      _id: 6,
      name: 'Mock Event',
      acl: eventAcl
    });

    sinon.mock(EventModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockEvent)
      .onSecondCall()
      .yields(null, mockEvent);

    sinon.mock(UserModel)
      .expects('findByIdAndUpdate')
      .withArgs(userId, {recentEventIds: [6,5,4,3,2]}, {new: true})
      .yields(null, mockUser);

    request(app)
      .post('/api/users/' + userId.toString() + '/events/6/recent' )
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

  it('should add recent event for acl user', function(done) {
    mockTokenWithPermission('NO_ADMIN_PERMISSION');

    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    var eventAcl = {};
    eventAcl[userId.toString()] = 'OWNER';
    var mockEvent = new EventModel({
      _id: 1,
      name: 'Mock Event',
      acl: eventAcl
    });

    sinon.mock(EventModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockEvent)
      .onSecondCall()
      .yields(null, mockEvent);

    sinon.mock(UserModel)
      .expects('findByIdAndUpdate')
      .withArgs(userId, {recentEventIds: [1]}, {new: true})
      .yields(null, mockUser);

    request(app)
      .post('/api/users/' + userId.toString() + '/events/1/recent' )
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

  it('should add recent event for user in event', function(done) {
    mockTokenWithPermission('NO_ADMIN_PERMISSION');

    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    var mockEvent1 = new EventModel({
      _id: 1,
      name: 'Mock Event 12345',
      acl: {}
    });

    sinon.mock(EventModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockEvent1);

    sinon.mock(EventModel)
      .expects('populate')
      .yields(null, {
        teamIds: [{
          userIds: [userId]
        }]
      });

    sinon.mock(UserModel)
      .expects('findByIdAndUpdate')
      .withArgs(userId, {recentEventIds: [1]}, {new: true})
      .yields(null, mockUser);

    request(app)
      .post('/api/users/' + userId.toString() + '/events/1/recent' )
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

  it('should fail to add recent event for user not in event', function(done) {
    mockTokenWithPermission('NO_ADMIN_PERMISSION');

    var mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: {
        type: 'local'
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    var mockEvent = new EventModel({
      _id: 1,
      name: 'Mock Event',
      acl: {}
    });

    sinon.mock(EventModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockEvent)
      .onSecondCall()
      .yields(null, mockEvent);

    sinon.mock(UserModel)
      .expects('findByIdAndUpdate')
      .withArgs(userId, {recentEventIds: [1]}, {new: true})
      .yields(null, mockUser);

    request(app)
      .post('/api/users/' + userId.toString() + '/events/1/recent' )
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(403)
      .end(done);
  });

});
