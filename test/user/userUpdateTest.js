var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , mongoose = require('mongoose');

require('../../models/token');
var TokenModel = mongoose.model('Token');

var User = require('../../models/user');
var UserModel = mongoose.model('User');

require('sinon-mongoose');

describe("user update tests", function() {

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

    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);

    sandbox.mock(mockUser)
      .expects('save')
      .yields(null, mockUser);

    sandbox.mock(mockUser)
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
        phone: '000-000-0000',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
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

    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);

    request(app)
      .put('/api/users/myself')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        password: 'password',
        passwordconfirm: 'passwordconfirm'
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

    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);

    request(app)
      .put('/api/users/myself')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        password: 'password',
        passwordconfirm: 'password'
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

    sandbox.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sandbox.mock(mockUser)
      .expects('save')
      .yields(null, mockUser);

    sandbox.mock(mockUser)
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

    sandbox.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sandbox.mock(User)
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

  it('should deactivate user', function(done) {
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

    sandbox.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sandbox.mock(User)
      .expects('updateUser')
      .withArgs(sinon.match({active: false}))
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        active: 'false'
      })
      .expect(200)
      .expect('Content-Type', /json/)
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

    sandbox.mock(UserModel)
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

    sandbox.mock(UserModel)
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

    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);

    sandbox.mock(mockUser)
      .expects('save')
      .yields(null, mockUser);

    sandbox.mock(mockUser)
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

    sandbox.mock(TokenModel)
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

    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);

    sandbox.mock(mockUser)
      .expects('save')
      .yields(null, mockUser);

    sandbox.mock(mockUser)
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

});
