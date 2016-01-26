var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , app = require('../express')
  , mongoose = require('mongoose');

require('../models/token');
var TokenModel = mongoose.model('Token');

require('../models/user');
var UserModel = mongoose.model('User');

require('sinon-mongoose');

describe("user tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function() {
    var token = {
      _id: '1',
      token: '12345',
      userId: {
        populate: function(field, callback) {
          callback(null, {
            _id: '1',
            username: 'test',
            roleId: {
              permissions: ['READ_USER']
            }
          });
        }
      }
    };

    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, token);
  });

  afterEach(function() {
    sandbox.restore();
  });

  it("should logout without token", function(done) {
    sandbox.mock(TokenModel)
      .expects('findByIdAndRemove')
      .withArgs("1")
      .yields(null);

    request(app)
      .post('/api/logout')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect(function(res) {
        console.log('res body', res.body);
      })
      .end(done);
  });

  it("should logout with token", function(done) {
    sandbox.mock(TokenModel)
      .expects('findByIdAndRemove')
      .withArgs("1")
      .yields(null);

    request(app)
      .post('/api/logout')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .expect(function(res) {
        res.text.should.equal('successfully logged out');
      })
      .end(done);
  });

  it('should count users', function(done) {
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

  it('get all users', function(done) {
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

});
