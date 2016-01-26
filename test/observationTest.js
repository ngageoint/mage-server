var sinon = require('sinon')
  , mongoose = require('mongoose')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');


describe("observation tests", function() {

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

  xit("should create an observation for an event", function(done) {

  });

  xit("should reject new observation w/o type", function(done) {

  });

  xit("should reject new observation w/o properties", function(done) {

  });

  xit("should reject new observation w/o timestamp", function(done) {

  });

  xit("should reject new observation for event you are not part of", function(done) {

  });

  xit("should get observations for event", function(done) {

  });

  xit("should get observation for id", function(done) {

  });

  xit("should update observation for id", function(done) {

  });

  xit("should update observation state to archived", function(done) {

  });


});
