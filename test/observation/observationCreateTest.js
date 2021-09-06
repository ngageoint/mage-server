var request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

var Observation = require('../../models/observation');
var observationModel = Observation.observationModel;
var ObservationIdModel = mongoose.model('ObservationId');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("observation create tests", function () {

  let app;

  beforeEach(function () {
    var mockEvent = EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      form: {
        fields: [{
          type: "date",
          name: "timestamp",
          title: "Date",
          required: true
        }, {
          type: "geometry",
          name: "geometry",
          title: "Location",
          required: true
        }, {
          type: "dropdown",
          name: "type",
          title: "type",
          choices: [{
            id: 1,
            value: 1,
            title: 'test'
          }],
          required: true
        }],
        userFields: []
      }

    });

    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

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

  afterEach(function () {
    sinon.restore();
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should create an observation id", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var mockObservation = new ObservationIdModel({ _id: mongoose.Types.ObjectId() });
    sinon.mock(ObservationIdModel)
      .expects('create')
      .withArgs({})
      .yields(null, mockObservation);

    request(app)
      .post('/api/events/1/observations/id')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send()
      .expect(201)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        should.exist(res.body);
        res.body.should.have.property('id');
      })
      .end(done);
  });

  it("should create an observation for an event", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var observationId = mongoose.Types.ObjectId();
    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, { _id: observationId });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: '2016-01-01T00:00:00'
      },
      forms: []
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, null)
      .onSecondCall()
      .resolves(mockObservation);

    sinon.mock(mockObservation)
      .expects('save')
      .resolves(mockObservation);

    sinon.mock(mockObservation)
      .expects('execPopulate')
      .resolves(mockObservation);

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
          type: 'test',
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        var observation = res.body;
        should.exist(observation);
        res.body.should.have.property('id');
        res.body.should.have.property('url');
      })
      .end(done);
  });

  it("should reject new observation with invalid id", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    var observationId = mongoose.Types.ObjectId();
    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, null);

    var ObservationModel = observationModel({
      _id: observationId,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

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
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(404)
      .end(done);
  });

  it("should reject new observation for invalid permission", function (done) {
    mockTokenWithPermission('UPDATE_OBSERVATION');

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
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
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(403)
      .expect(function (res) {
        res.text.should.equal("Forbidden");
      })
      .end(done);
  });

  it("should reject new observation w/o geometry", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, { _id: 1 });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        properties: {
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(400)
      .expect(function(res) {
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Location is required\n");
      })
      .end(done);
  });

  it("should reject new observation with invalid geometry", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, { _id: 1 });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-181, 0]
        },
        properties: {
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(400)
      .expect(function(res) {
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Location must be GeoJSON\n");
      })
      .end(done);
  });

  it("should reject new observation w/o properties", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, { _id: 1 });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
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
      .expect(function (res) {
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Date is required\n");
      })
      .end(done);
  });

  it("should reject new observation w/o timestamp", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, { _id: 1 });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
        }
      })
      .expect(400)
      .expect(function(res) {
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Date is required\n");
      })
      .end(done);
  });

  it("should reject new observation with invalid timestamp", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, { _id: 1 });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    request(app)
      .put('/api/events/1/observations/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          timestamp: 'not a timestamp'
        }
      })
      .expect(400)
      .expect(function(res) {
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Date must be an ISO8601 string\n");
      })
      .end(done);
  });

  it("should reject new observation for event you are not part of", function (done) {
    mockTokenWithPermission('CREATE_OBSERVATION');

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, []);

    request(app)
      .post('/api/events/1/observations/id')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        type: 'Feature',
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(403)
      .expect(function (res) {
        res.text.should.equal("Cannot submit an observation for an event that you are not part of.");
      })
      .end(done);
  }); 

  it("should reject observation with invalid total min forms", function (done) {
    sinon.restore();
    
    mockTokenWithPermission('CREATE_OBSERVATION');

    var mockEvent = EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      minObservationForms: 1,
      form: {
        fields: [{
          type: "date",
          name: "timestamp",
          title: "Date",
          required: true
        }, {
          type: "geometry",
          name: "geometry",
          title: "Location",
          required: true
        }, {
          type: "dropdown",
          name: "type",
          title: "type",
          choices: [{
            id: 1,
            value: 1,
            title: 'test'
          }],
          required: true
        }],
        userFields: []
      }

    });

    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var observationId = mongoose.Types.ObjectId();
    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, { _id: observationId });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: '2016-01-01T00:00:00'
      }
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    sinon.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .withArgs(observationId.toString(), sinon.match.any, { new: true, upsert: true })
      .chain('populate').withArgs({ path: 'userId', select: 'displayName' })
      .chain('populate').withArgs({ path: 'important.userId', select: 'displayName' })
      .chain('exec')
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
          type: 'test',
          timestamp: '2016-01-01T00:00:00'
        }
      })
      .expect(400)
      .expect(function (res) {
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Total number of forms in observation must be at least 1\n");
      })
      .end(done);
  });

  it("should reject observation with invalid total max forms", function (done) {
    sinon.restore();

    mockTokenWithPermission('CREATE_OBSERVATION');

    var mockEvent = EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      maxObservationForms: 1,
      forms: {
        _id: 1,
        fields: [{
          type: "dropdown",
          name: "field1",
          title: "type",
          choices: [{
            id: 1,
            value: 1,
            title: 'test'
          }],
          required: true
        }],
        userFields: []
      }

    });

    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var observationId = mongoose.Types.ObjectId();
    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, { _id: observationId });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: '2016-01-01T00:00:00',
        forms: [{
          formId: 1,
          field1: 'test'
        },{
          formId: 1,
          field1: 'test'
        }]
      }
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    sinon.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .withArgs(observationId.toString(), sinon.match.any, { new: true, upsert: true })
      .chain('populate').withArgs({ path: 'userId', select: 'displayName' })
      .chain('populate').withArgs({ path: 'important.userId', select: 'displayName' })
      .chain('exec')
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
          type: 'test',
          timestamp: '2016-01-01T00:00:00',
          forms: [{
            formId: 1,
            field1: 'test'
          }, {
            formId: 1,
            field1: 'test'
          }]
        }
      })
      .expect(400)
      .expect(function (res) {
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Total number of forms in observation cannot be more than 1\n");
      })
      .end(done);
  });

  it("should reject observation with invalid min forms", function (done) {
    sinon.restore();

    mockTokenWithPermission('CREATE_OBSERVATION');

    var mockEvent = EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      maxObservationForms: 1,
      forms: {
        _id: 1,
        name: 'Test Form',
        min: 2,
        fields: [{
          type: "dropdown",
          name: "field1",
          title: "type",
          choices: [{
            id: 1,
            value: 1,
            title: 'test'
          }],
          required: true
        }],
        userFields: []
      }

    });

    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var observationId = mongoose.Types.ObjectId();
    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, { _id: observationId });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: '2016-01-01T00:00:00',
        forms: [{
          formId: 1,
          field1: 'test'
        }]
      }
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    sinon.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .withArgs(observationId.toString(), sinon.match.any, { new: true, upsert: true })
      .chain('populate').withArgs({ path: 'userId', select: 'displayName' })
      .chain('populate').withArgs({ path: 'important.userId', select: 'displayName' })
      .chain('exec')
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
          type: 'test',
          timestamp: '2016-01-01T00:00:00',
          forms: [{
            formId: 1,
            field1: 'test'
          }]
        }
      })
      .expect(400)
      .expect(function (res) {
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Test Form form must be included in observation at least 2 times\n");
      })
      .end(done);
  });

  it("should reject observation with invalid max forms", function (done) {
    sinon.restore();

    mockTokenWithPermission('CREATE_OBSERVATION');

    var mockEvent = EventModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1',
      forms: {
        _id: 1,
        name: 'Test Form',
        max: 1,
        fields: [{
          type: "dropdown",
          name: "field1",
          title: "type",
          choices: [{
            id: 1,
            value: 1,
            title: 'test'
          }],
          required: true
        }],
        userFields: []
      }

    });

    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    sinon.mock(TeamModel)
      .expects('find')
      .yields(null, [{ name: 'Team 1' }]);

    var observationId = mongoose.Types.ObjectId();
    sinon.mock(ObservationIdModel)
      .expects('findById')
      .yields(null, { _id: observationId });

    var ObservationModel = observationModel({
      _id: 1,
      name: 'Event 1',
      collectionName: 'observations1'
    });

    var mockObservation = new ObservationModel({
      _id: observationId,
      type: 'Feature',
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      },
      properties: {
        timestamp: '2016-01-01T00:00:00',
        forms: [{
          formId: 1,
          field1: 'test'
        },{
          formId: 1,
          field1: 'test'
        }]
      }
    });

    sinon.mock(ObservationModel)
      .expects('findById')
      .yields(null, null);

    sinon.mock(ObservationModel)
      .expects('findByIdAndUpdate')
      .withArgs(observationId.toString(), sinon.match.any, { new: true, upsert: true })
      .chain('populate').withArgs({ path: 'userId', select: 'displayName' })
      .chain('populate').withArgs({ path: 'important.userId', select: 'displayName' })
      .chain('exec')
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
          type: 'test',
          timestamp: '2016-01-01T00:00:00',
          forms: [{
            formId: 1,
            field1: 'test'
          },{
            formId: 1,
            field1: 'test'
          }]
        }
      })
      .expect(400)
      .expect(function (res) {
        const error = JSON.parse(res.error.text);
        error.message.should.equal("• Test Form form cannot be included in observation more than 1 times\n");
      })
      .end(done);
  });
});
