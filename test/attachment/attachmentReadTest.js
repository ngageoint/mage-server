var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , moment = require('moment')
  , fs = require('fs-extra')
  , stream = require('stream')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;

describe("observation read tests", function() {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function() {
    var mockEvent = new EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);
  });

  afterEach(function() {
    sandbox.restore();
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    var token =  {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function(field, callback) {
          callback(null, {
            _id: userId,
            username: 'test',
            roleId: {
              permissions: [permission]
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
  }

  it("should get attachments for event I am a part of", function(done) {
    mockTokenWithPermission('READ_OBSERVATION_EVENT');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sandbox.mock(EventModel)
      .expects('populate')
      .yields(null, {
        name: 'Event 1',
        teamIds: [{
          name: 'Team 1',
          userIds: [userId]
        }]
      });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var observationId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      },
      attachments: [{
        size: 200,
        contentType: 'image/jpeg',
        relativePath: 'some/relative/path'
      },{
        size: 4096,
        contentType: 'image/jpeg',
        relativePath: 'some/relative/path'
      }]
    });

    sandbox.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations/' + observationId + '/attachments')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function(res) {
        var attachments = res.body;
        should.exist(attachments);
        attachments.should.be.an('array');
        attachments.should.have.length(2);
      })
      .end(done);
  });

  it("should get attachment for any event", function(done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var observationId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      },
      attachments: [{
        size: 4096,
        contentType: 'image/jpeg',
        relativePath: 'some/relative/path'
      }]
    });

    sandbox.mock(ObservationModel)
      .expects('findById')
      .withArgs(observationId.toString())
      .yields(null, mockObservation);

    sandbox.mock(ObservationModel)
      .expects('findOne')
      .withArgs({_id: observationId})
      .yields(null, mockObservation);

    var mockedStream = new stream.Readable();
    mockedStream._read = function noop() {
      this.push('mock');
      this.push(null);
    };

    sandbox.mock(fs)
      .expects('createReadStream')
      .returns(mockedStream);

    request(app)
      .get('/api/events/1/observations/' + observationId + '/attachments/456')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', 'image/jpeg')
      .expect('Content-Length', 4096)
      .end(done);
  });

  xit("should get observations and filter on start and end date", function(done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var observationId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      }
    });

    var startDate = moment("2016-01-01T00:00:00");
    var endDate = moment("2016-02-01T00:00:00");
    sandbox.mock(ObservationModel)
      .expects('find')
      .withArgs({
        lastModified: {
          $gte: startDate.toDate(),
          $lt: endDate.toDate()
        }
      })
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({startDate: startDate.toISOString(), endDate: endDate.toISOString()})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function(res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  xit("should get observations and filter on observationStartDate and observationEndDate", function(done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var observationId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      }
    });

    var startDate = moment("2016-01-01T00:00:00");
    var endDate = moment("2016-02-01T00:00:00");
    sandbox.mock(ObservationModel)
      .expects('find')
      .withArgs({
        "properties.timestamp": {
          $gte: startDate.toDate(),
          $lt: endDate.toDate()
        }
      })
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({observationStartDate: startDate.toISOString(), observationEndDate: endDate.toISOString()})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function(res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  xit("should get observations and filter on bbox", function(done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var observationId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      }
    });

    var bbox = [0, 0, 10, 10];
    sandbox.mock(ObservationModel)
      .expects('find')
      .withArgs({
        geometry: {
          $geoIntersects: {
            $geometry: {
              coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
              type: "Polygon"
            }
          }
        }
      })
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({bbox: JSON.stringify(bbox)})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function(res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  xit("should get observations and filter on geometry", function(done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var observationId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      }
    });

    var geometry =  {
      type: "Polygon",
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
    };
    sandbox.mock(ObservationModel)
      .expects('find')
      .withArgs({
        geometry: {
          $geoIntersects: {
            $geometry: {
              coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
              type: "Polygon"
            }
          }
        }
      })
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({geometry: JSON.stringify(geometry)})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function(res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  xit("should get observations and filter on states", function(done) {
    mockTokenWithPermission('READ_OBSERVATION_ALL');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
    var observationId = mongoose.Types.ObjectId();
    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: Date.now()
      }
    });

    var states = 'active,archive';
    sandbox.mock(ObservationModel)
      .expects('find')
      .withArgs({
        "states.0.name": { $in: ['active', 'archive'] }
      })
      .yields(null, mockObservation);

    request(app)
      .get('/api/events/1/observations')
      .query({states: states})
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect(function(res) {
        var observation = res.body;
        should.exist(observation);
      })
      .end(done);
  });

  xit("should deny observations for event I am not part of", function(done) {
    mockTokenWithPermission('READ_OBSERVATION_EVENT');

    sandbox.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sandbox.mock(EventModel)
      .expects('populate')
      .yields(null, {
        name: 'Event 1',
        teamIds: [{
          name: 'Team 1',
          userIds: [mongoose.Types.ObjectId()]
        }]
      });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });
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
      .expects('find')
      .yields(null, [mockObservation]);

    request(app)
      .get('/api/events/1/observations')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(403)
      .expect(function(res) {
        res.text.should.equal('Forbidden');
      })
      .end(done);
  });
});
