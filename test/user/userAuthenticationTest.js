var request = require('supertest')
  , sinon = require('sinon')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , mongoose = require('mongoose');

require('../../models/token');
var TokenModel = mongoose.model('Token');

require('sinon-mongoose');

describe("user authentication tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function() {
    sandbox.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(mongoose.Types.ObjectId(), ['READ_USER']));
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

});
