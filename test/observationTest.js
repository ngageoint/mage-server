var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , moment = require('moment')
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

  describe("create tests", function() {
    beforeEach(function() {
      var mockEvent = {
        _id: 1,
        name: 'Event 1',
        collectionName: 'observations1'
      };
      sandbox.mock(EventModel)
        .expects('findById')
        .yields(null, mockEvent);
    });

    it("should create an observation for an event", function(done) {
      mockTokenWithPermission('CREATE_OBSERVATION');

      sandbox.mock(TeamModel)
        .expects('find')
        .yields(null, [{ name: 'Team 1' }]);

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
            type: 'type',
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

    it("should reject new observation for invalid permission", function(done) {
      mockTokenWithPermission('READ_OBSERVATION');

      sandbox.mock(TeamModel)
        .expects('find')
        .yields(null, []);

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
            type: 'type',
            timestamp: Date.now()
          }
        })
        .expect(403)
        .expect(function(res) {
          res.text.should.equal("Forbidden");
        })
        .end(done);
    });

    it("should reject new observation w/o type", function(done) {
      mockTokenWithPermission('CREATE_OBSERVATION');

      sandbox.mock(TeamModel)
        .expects('find')
        .yields(null, [{ name: 'Team 1' }]);

      request(app)
        .post('/api/events/1/observations')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .send({
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          },
          properties: {
            timestamp: Date.now()
          }
        })
        .expect(400)
        .expect(function(res) {
          res.text.should.equal("cannot create observation 'type' param not specified, or is not set to 'Feature'");
        })
        .end(done);
    });

    it("should reject new observation w/o geometry", function(done) {
      mockTokenWithPermission('CREATE_OBSERVATION');

      sandbox.mock(TeamModel)
        .expects('find')
        .yields(null, [{ name: 'Team 1' }]);

      request(app)
        .post('/api/events/1/observations')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .send({
          type: 'Feature',
          properties: {
            type: 'type',
            timestamp: Date.now()
          }
        })
        .expect(400)
        .expect(function(res) {
          res.text.should.equal("cannot create observation 'geometry' param not specified");
        })
        .end(done);
    });

    it("should reject new observation w/o properties", function(done) {
      mockTokenWithPermission('CREATE_OBSERVATION');

      sandbox.mock(TeamModel)
        .expects('find')
        .yields(null, [{ name: 'Team 1' }]);

      request(app)
        .post('/api/events/1/observations')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .send({
          type: 'Feature',
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        })
        .expect(400)
        .end(done);
    });

    it("should reject new observation w/o timestamp", function(done) {
      mockTokenWithPermission('CREATE_OBSERVATION');

      sandbox.mock(TeamModel)
        .expects('find')
        .yields(null, [{ name: 'Team 1' }]);

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
            type: 'type'
          }
        })
        .expect(400)
        .expect(function(res) {
          res.text.should.equal("cannot create observation 'properties.timestamp' param not specified");
        })
        .end(done);
    });

    it("should reject new observation w/o type", function(done) {
      mockTokenWithPermission('CREATE_OBSERVATION');

      sandbox.mock(TeamModel)
        .expects('find')
        .yields(null, [{ name: 'Team 1' }]);

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
        .expect(400)
        .expect(function(res) {
          res.text.should.equal("cannot create observation 'properties.type' param not specified");
        })
        .end(done);
    });

    it("should reject new observation for event you are not part of", function(done) {
      mockTokenWithPermission('CREATE_OBSERVATION');

      sandbox.mock(TeamModel)
        .expects('find')
        .yields(null, []);

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
            type: 'type',
            timestamp: Date.now()
          }
        })
        .expect(403)
        .expect(function(res) {
          res.text.should.equal("Cannot submit an observation for an event that you are not part of.");
        })
        .end(done);
    });

  });

  describe("read tests", function() {
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

    it("should get observations for any event", function(done) {
      mockTokenWithPermission('READ_OBSERVATION_ALL');

      sandbox.mock(TeamModel)
        .expects('find')
        .yields(null, [{ name: 'Team 1' }]);

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
        .expect(200)
        .expect(function(res) {
          var observations = res.body;
          should.exist(observations);
          observations.should.be.an('array');
          observations.should.have.length(1);
        })
        .end(done);
    });

    it("should get observations for event I am a part of", function(done) {
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
        .expect(200)
        .expect(function(res) {
          var observations = res.body;
          should.exist(observations);
          observations.should.be.an('array');
          observations.should.have.length(1);
        })
        .end(done);
    });

    it("should get observations and filter on start and end date", function(done) {
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

    it("should get observations and filter on observationStartDate and observationEndDate", function(done) {
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

    it("should get observations and filter on bbox", function(done) {
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

    it("should get observations and filter on geometry", function(done) {
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

    it("should get observations and filter on states", function(done) {
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

    it ("should get observations and sort on lastModified", function(done) {
      mockTokenWithPermission('READ_OBSERVATION_ALL');

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

      var sort = 'lastModified';
      sandbox.mock(ObservationModel)
        .expects('find')
        .withArgs(sinon.match.any, sinon.match.any, { sort: { lastModified: 1 } })
        .yields(null, mockObservation);

      request(app)
        .get('/api/events/1/observations')
        .query({sort: sort})
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .expect(200)
        .expect(function(res) {
          var observation = res.body;
          should.exist(observation);
        })
        .end(done);
    });

    it ("should get observations and sort on DESC lastModified", function(done) {
      mockTokenWithPermission('READ_OBSERVATION_ALL');

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

      var sort = 'lastModified+DESC';
      sandbox.mock(ObservationModel)
        .expects('find')
        .withArgs(sinon.match.any, sinon.match.any, { sort: { lastModified: -1 } })
        .yields(null, mockObservation);

      request(app)
        .get('/api/events/1/observations')
        .query({sort: sort})
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .expect(200)
        .expect(function(res) {
          var observation = res.body;
          should.exist(observation);
        })
        .end(done);
    });

    it("should deny observations with invalid sort parameter", function(done) {
      mockTokenWithPermission('READ_OBSERVATION_ALL');

      request(app)
        .get('/api/events/1/observations')
        .query({sort: 'properties'})
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .expect(400)
        .expect(function(res) {
          res.text.should.equal("Cannot sort on column 'properties'");
        })
        .end(done);
    });

    it("should deny observations for event I am not part of", function(done) {
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

    it("should get observation for any event by id", function(done) {
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
      sandbox.mock(ObservationModel)
        .expects('findById')
        .yields(null, mockObservation);

      request(app)
        .get('/api/events/1/observations/123')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .expect(200)
        .expect(function(res) {
          var observation = res.body;
          should.exist(observation);
        })
        .end(done);
    });

    it("should get observation and filter fields for any event by id", function(done) {
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
      sandbox.mock(ObservationModel)
        .expects('findById')
        .withArgs('123', { geometry: 1, id: true, "properties.timestamp": 1, type: true })
        .yields(null, mockObservation);

      request(app)
        .get('/api/events/1/observations/123')
        .query({fields: JSON.stringify({"geometry": 1, "properties": {"timestamp": 1}})})
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .expect(200)
        .expect(function(res) {
          var observation = res.body;
          should.exist(observation);
        })
        .end(done);
    });
  });

  describe("update tests", function() {
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

    it("should update observation for id", function(done) {
      mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

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
        }
      });
      sandbox.mock(ObservationModel)
        .expects('findByIdAndUpdate')
        .yields(null, mockObservation);

      request(app)
        .put('/api/events/1/observations/' + observationId.toString())
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .send({
          type: 'Feature',
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          },
          properties: {
            type: 'type',
            timestamp: Date.now()
          }
        })
        .expect(200)
        .expect(function(res) {
          var observation = res.body;
          should.exist(observation);
          observation.should.have.property('id');
          observation.should.have.property('url');
        })
        .end(done);
    });

    it("should deny update observation for event I am not part of", function(done) {
      mockTokenWithPermission('UPDATE_OBSERVATION_EVENT');

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
      sandbox.mock(ObservationModel)
        .expects('findByIdAndUpdate')
        .yields(null, mockObservation);

      request(app)
        .put('/api/events/1/observations/' + observationId.toString())
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .send({
          type: 'Feature',
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          },
          properties: {
            type: 'type',
            timestamp: Date.now()
          }
        })
        .expect(403)
        .expect(function(res) {
          res.text.should.equal('Forbidden');
        })
        .end(done);
    });

  });

  describe("state tests", function() {
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

    it("should update observation state to archived", function(done) {
      mockTokenWithPermission('DELETE_OBSERVATION');

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
      sandbox.mock(ObservationModel)
        .expects('update')
        .yields(null, mockObservation);

      request(app)
        .post('/api/events/1/observations/' + observationId.toString() + '/states')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .send({
          name: 'archive'
        })
        .expect(201)
        .expect(function(res) {
          var state = res.body;
          should.exist(state);
          state.should.have.property('name').and.equal('archive');
        })
        .end(done);
    });

    it("should not update observation state if name is missing", function(done) {
      mockTokenWithPermission('DELETE_OBSERVATION');

      request(app)
        .post('/api/events/1/observations/123/states')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .send({
        })
        .expect(400)
        .expect(function(res) {
          res.text.should.equal('name required');
        })
        .end(done);
    });

    it("should not update observation state if name is not allowed", function(done) {
      mockTokenWithPermission('DELETE_OBSERVATION');

      request(app)
        .post('/api/events/1/observations/123/states')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 12345')
        .send({
          name: 'foo'
        })
        .expect(400)
        .expect(function(res) {
          res.text.should.equal("state name must be one of 'active', 'complete', 'archive'");
        })
        .end(done);
    });

  });
});
