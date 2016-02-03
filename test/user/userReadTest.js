var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , mockfs = require('mock-fs')
  , mongoose = require('mongoose');

require('../../models/token');
var TokenModel = mongoose.model('Token');

require('../../models/user');
var UserModel = mongoose.model('User');

require('sinon-mongoose');

describe("user read tests", function() {

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

  it('should count users', function(done) {
    mockTokenWithPermission('READ_USER');

    sandbox.mock(UserModel)
      .expects('count')
      .yields(null, 5);

    request(app)
      .get('/api/users/count')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        should.exist(res.body);
        res.body.should.have.property('count');
        res.body.count.should.equal(5);
      })
      .end(done);
  });

  it('should get all users', function(done) {
    mockTokenWithPermission('READ_USER');

    var mockUsers = [{
      username: 'test1'
    },{
      username: 'test2'
    }];

    sandbox.mock(UserModel)
      .expects('find')
      .chain('exec')
      .yields(null, mockUsers);

    request(app)
      .get('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var users = res.body;
        should.exist(users);
        users.should.be.an('array');
        users.should.have.length.of(2);
        users.should.deep.include.members(mockUsers);
      })
      .end(done);
  });

  it('should get all active users', function(done) {
    mockTokenWithPermission('READ_USER');

    sandbox.mock(UserModel)
      .expects('find')
      .withArgs({ active: true })
      .chain('exec')
      .yields(null, [{
        username: 'test1'
      },{
        username: 'test2'
      }]);

    request(app)
      .get('/api/users')
      .query({active: 'true'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done);
  });


  it('should get all inactive users', function(done) {
    mockTokenWithPermission('READ_USER');

    sandbox.mock(UserModel)
      .expects('find')
      .withArgs({ active: false })
      .chain('exec')
      .yields(null, [{
        username: 'test1'
      },{
        username: 'test2'
      }]);

    request(app)
      .get('/api/users')
      .query({active: 'false'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done);
  });

  it('should get all users and populate role', function(done) {
    mockTokenWithPermission('READ_USER');

    sandbox.mock(UserModel)
      .expects('find')
      .chain('populate')
      .withArgs([{ path: "roleId" }])
      .chain('exec')
      .yields(null, [{
        username: 'test1'
      },{
        username: 'test2'
      }]);

    request(app)
      .get('/api/users')
      .query({populate: 'roleId'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done);
  });


  it('should get user by id', function(done) {
    mockTokenWithPermission('READ_USER');

    var id = mongoose.Types.ObjectId();

    sandbox.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, new UserModel({
        _id: id,
        username: 'test'
      }));

    request(app)
      .get('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
        user.should.have.property('username').that.equals('test');
      })
      .end(done);
  });

  it('should get myself', function(done) {
    mockTokenWithPermission('READ_USER');

    request(app)
      .get('/api/users/myself')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var myself = res.body;
        should.exist(myself);
        myself.id.should.equal(userId.toString());
      })
      .end(done);
  });

  it('should get user avatar', function(done) {
    mockTokenWithPermission('READ_USER');

    mockfs({
      '/var/lib/mage/users/mock/path/avatar.jpeg': new Buffer([8, 6, 7, 5, 3, 0, 9])
    });

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test1',
      avatar: {
        relativePath: 'mock/path/avatar.jpeg',
        contentType: 'image/jpeg',
        size: 256
      }
    });

    sandbox.mock(UserModel)
      .expects('findById')
      .withArgs(id.toString())
      .chain('populate')
      .chain('exec')
      .yields(null, mockUser);

    request(app)
      .get('/api/users/' + id.toString() + '/avatar')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /image\/jpeg/)
      .end(function(err) {
        mockfs.restore();
        done(err);
      });
  });

  it('should fail to get non existant user avatar', function(done) {
    mockTokenWithPermission('READ_USER');

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test1',
      avatar: {
        relativePath: 'mock/path/avatar.jpeg',
        contentType: 'image/jpeg',
        size: 256
      }
    });

    sandbox.mock(UserModel)
      .expects('findById')
      .withArgs(id.toString())
      .chain('populate')
      .chain('exec')
      .yields(null, mockUser);

    request(app)
      .get('/api/users/' + id.toString() + '/avatar')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(404)
      .end(done);
  });

  it('should get user icon', function(done) {
    mockTokenWithPermission('READ_USER');

    mockfs({
      '/var/lib/mage/users/mock/path/icon.png': new Buffer([8, 6, 7, 5, 3, 0, 9])
    });

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test1',
      icon: {
        relativePath: 'mock/path/icon.png',
        contentType: 'image/png',
        size: 48
      }
    });

    sandbox.mock(UserModel)
      .expects('findById')
      .withArgs(id.toString())
      .chain('populate')
      .chain('exec')
      .yields(null, mockUser);

    request(app)
      .get('/api/users/' + id.toString() + '/icon')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /image\/png/)
      .end(function(err) {
        mockfs.restore();
        done(err);
      });
  });

});
