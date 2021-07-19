/*
TODO:
These and most of the other tests demonstrate the need to improve the overall
code architecture.  There is a lot of brittle mocking:
  mock(UserModel)
    .expects('method')
    .chain('nextMethod')
    .yields(callbackArgs)
We can improve this by following patterns like Loopback (https://loopback.io/doc/en/lb4/index.html)
implements as well as several articles on implementing Clean Architecture
- https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- https://mannhowie.com/clean-architecture-node
We can create a layer of repositories for querying models, so that no outer
controller/service level classes have access to the underlying Mongoose models,
or the actual MongoDB API.  This will make testing routes easier because we
would only need to mock an injected repository with a higher level API instead
of mocking the actual Mongoose model classes which is cumbersome.  This is
ostensibly somewhat similar to what the api module intended, but there is a lot
of leakage throughout the code that needs to be cleaned.  Further, pretty much
the entire codebase lacks any dependency injection.
 */

 "use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , MockToken = require('../mockToken')
  , mockfs = require('mock-fs')
  , mongoose = require('mongoose');

require('../../models/token');
const TokenModel = mongoose.model('Token');

require('../../models/user');
const UserModel = mongoose.model('User');

require('sinon-mongoose');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("user read tests", function() {

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

  const userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it('should count users', function(done) {
    mockTokenWithPermission('READ_USER');

    sinon.mock(UserModel)
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

    const mockUsers = [{
      username: 'test1'
    },{
      username: 'test2'
    }];

    sinon.mock(UserModel)
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
        const users = res.body;
        should.exist(users);
        users.should.be.an('array');
        users.should.have.lengthOf(2);
        users.should.deep.include.members(mockUsers);
      })
      .end(done);
  });

  it('should get all active users', function(done) {
    mockTokenWithPermission('READ_USER');

    sinon.mock(UserModel)
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

    sinon.mock(UserModel)
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

  it('should get all enabled users', function(done) {
    mockTokenWithPermission('READ_USER');

    sinon.mock(UserModel)
      .expects('find')
      .withArgs({ enabled: true })
      .chain('exec')
      .yields(null, [{
        username: 'test1'
      },{
        username: 'test2'
      }]);

    request(app)
      .get('/api/users')
      .query({enabled: 'true'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done);
  });

  it('should get all disabled users', function(done) {
    mockTokenWithPermission('READ_USER');

    sinon.mock(UserModel)
      .expects('find')
      .withArgs({ enabled: false })
      .chain('exec')
      .yields(null, [{
        username: 'test1'
      },{
        username: 'test2'
      }]);

    request(app)
      .get('/api/users')
      .query({enabled: 'false'})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done);
  });

  it('should get all users and populate role', function(done) {
    mockTokenWithPermission('READ_USER');

    sinon.mock(UserModel)
      .expects('find')
      .chain('populate', 'authenticationId')
      .chain('populate', 'roleId')
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

    const id = mongoose.Types.ObjectId();

    sinon.mock(UserModel)
      .expects('findById')
      .withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(new UserModel({
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
        const user = res.body;
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
      '/var/lib/mage/users/mock/path/avatar.jpeg': Buffer.from([8, 6, 7, 5, 3, 0, 9])
    });

    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test1',
      avatar: {
        relativePath: 'mock/path/avatar.jpeg',
        contentType: 'image/jpeg',
        size: 7
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    request(app)
      .get('/api/users/' + id.toHexString() + '/avatar')
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

    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test1',
      avatar: {
        relativePath: 'mock/path/avatar.jpeg',
        contentType: 'image/jpeg',
        size: 7
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    request(app)
      .get('/api/users/' + id.toHexString() + '/avatar')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(404)
      .end(done);
  });

  it('should get user icon', function(done) {
    mockTokenWithPermission('READ_USER');

    mockfs({
      '/var/lib/mage/users/mock/path/icon.png': Buffer.from([8, 6, 7, 5, 3, 0, 9])
    });

    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test1',
      icon: {
        relativePath: 'mock/path/icon.png',
        contentType: 'image/png',
        size: 7
      }
    });

    sinon.mock(UserModel)
      .expects('findById')
      .withArgs(id.toString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

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
