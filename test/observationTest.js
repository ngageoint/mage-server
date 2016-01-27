var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , app = require('../express')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../models/team');
var TeamModel = mongoose.model('Team');

require('../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../models/observation');
var observationModel = Observation.observationModel;

describe("observation tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function() {
  });

  afterEach(function() {
    sandbox.restore();
  });

  it("should create an observation for an event", function(done) {
    var token = {
      _id: '1',
      token: '12345',
      userId: {
        populate: function(field, callback) {
          callback(null, {
            _id: mongoose.Types.ObjectId(),
            username: 'test',
            roleId: {
              permissions: ['CREATE_OBSERVATION']
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

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var mockEvent = {
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    };
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var ObservationModel = observationModel(mockEvent);
    var mockObservation = new ObservationModel({
      _id: mongoose.Types.ObjectId(),
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      }
    });
    sandbox.mock(ObservationModel)
      .expects('create')
      .yields(null, mockObservation);

    request(app)
      .post('/api/events/1/observations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          timestamp: Date.now()
        }
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        var observation = res.body;
        should.exist(observation);
        res.body.should.have.property('id');
        res.body.should.have.property('url');
      })
      .end(done);
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
