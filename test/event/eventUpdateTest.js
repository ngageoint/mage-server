var request = require('supertest')
  , should = require('chai').should()
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

describe("event update tests", function() {

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

  it("should reject event with no fields", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, new EventModel({
        _id: eventId,
        name: 'testEvent'
      }));

    var teamId = mongoose.Types.ObjectId();
    var mockTeams = [{
      id: teamId,
      name: 'Mock Team'
    }];

    sandbox.mock(TeamModel)
      .expects('find')
      .withArgs({ _id: { $in: [teamId.toString()] }})
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeams);

    sandbox.mock(EventModel.collection)
      .expects('findAndModify')
      .yields(null);

    request(app)
      .put('/api/events/1')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        form: {
          fields: []
        }
      })
      .expect(400)
      .expect(function(res) {
        var error = res.text;
        should.exist(error);
        error.should.be.a('string');
        error = JSON.parse(error);
        error.should.have.property('message').that.equals("Validation failed");
        var errors = error.errors;
        should.exist(errors['form.fields']);
        errors['form.fields'].should.have.property('path').that.equals('form.fields');
      })
      .end(done);
  });

  it("should reject event with no type in form", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, new EventModel({
        _id: eventId,
        name: 'testEvent'
      }));

    var teamId = mongoose.Types.ObjectId();
    var mockTeams = [{
      id: teamId,
      name: 'Mock Team'
    }];

    sandbox.mock(TeamModel)
      .expects('find')
      .withArgs({ _id: { $in: [teamId.toString()] }})
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeams);

    sandbox.mock(EventModel.collection)
      .expects('findAndModify')
      .yields(null);

    request(app)
      .put('/api/events/1')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        form: {
          fields: [{
            name: 'timestamp',
            required: true
          },{
            name: 'geometry',
            required: true
          }]
        }
      })
      .expect(400)
      .expect(function(res) {
        var error = res.text;
        should.exist(error);
        error.should.be.a('string');
        error = JSON.parse(error);
        error.should.have.property('message').that.equals("Validation failed");
        var errors = error.errors;
        should.exist(errors['form.fields']);
        errors['form.fields'].should.have.property('path').that.equals('form.fields');
        errors['form.fields'].should.have.property('message').that.equals('fields array must contain one type field');
      })
      .end(done);
  });

  it("should reject event with invalid field in form", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, new EventModel({
        _id: eventId,
        name: 'testEvent'
      }));

    var teamId = mongoose.Types.ObjectId();
    var mockTeams = [{
      id: teamId,
      name: 'Mock Team'
    }];

    sandbox.mock(TeamModel)
      .expects('find')
      .withArgs({ _id: { $in: [teamId.toString()] }})
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeams);

    sandbox.mock(EventModel.collection)
      .expects('findAndModify')
      .yields(null);

    request(app)
      .put('/api/events/1')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        form: {
          fields: [{
            name: 'timestamp',
            required: true,
            type: 'date'
          },{
            name: 'geometry',
            required: true,
            type: 'geometry'
          },{
            name: 'type',
            required: true,
            type: 'dropdown'
          },{
            name: 'invalid',
            type: 'invalid'
          }]
        }
      })
      .expect(400)
      .expect(function(res) {
        var error = res.text;
        should.exist(error);
        error.should.be.a('string');
        error = JSON.parse(error);
        error.should.have.property('message').that.equals("Validation failed");
        var errors = error.errors;
        should.exist(errors['form.fields.3.type']);
        errors['form.fields.3.type'].should.have.property('message').that.equals("`invalid` is not a valid enum value for path `type`.");
      })
      .end(done);
  });

  it("should add team to event", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var teamId = mongoose.Types.ObjectId();
    var mockTeams = [{
      id: teamId,
      name: 'Mock Team'
    }];

    sandbox.mock(TeamModel)
      .expects('find')
      .withArgs({ _id: { $in: [teamId.toString()] }})
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeams);

    sandbox.mock(EventModel)
      .expects('findByIdAndUpdate')
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        teamIds: [teamId.toString()],
        form: {
          fields: [{
            name: 'timestamp',
            required: true
          },{
            name: 'geometry',
            required: true
          },{
            name: 'type',
            required: true
          }]
        }
      })
      .expect(200)
      .end(done);
  });

  it("should not add team that belongs to another event", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var teamId = mongoose.Types.ObjectId();
    var mockTeams = [{
      id: mongoose.Types.ObjectId(),
      name: 'Mock Team',
      teamEventId: 2
    }];

    sandbox.mock(TeamModel)
      .expects('find')
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeams);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        teamIds: [teamId.toString()],
        form: {
          fields: [{
            name: 'timestamp',
            required: true
          },{
            name: 'geometry',
            required: true
          },{
            name: 'type',
            required: true
          }]
        }
      })
      .expect(405)
      .expect(function(res) {
        res.text.should.equal("Cannot add a team that belongs specifically to another event");
      })
      .end(done);
  });

  it("should mark event as complete", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var teamId = mongoose.Types.ObjectId();
    var mockTeams = [{
      id: teamId,
      name: 'Mock Team'
    }];

    sandbox.mock(TeamModel)
      .expects('find')
      .withArgs({ _id: { $in: [teamId.toString()] }})
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeams);

    sandbox.mock(EventModel)
      .expects('findByIdAndUpdate')
      .withArgs(eventId, sinon.match({ complete: true }))
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        complete: true,
        form: {
          fields: [{
            name: 'timestamp',
            required: true
          },{
            name: 'geometry',
            required: true
          },{
            name: 'type',
            required: true
          }]
        }
      })
      .expect(200)
      .end(done);
  });

  it("should mark event as active", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var teamId = mongoose.Types.ObjectId();
    var mockTeams = [{
      id: teamId,
      name: 'Mock Team'
    }];

    sandbox.mock(TeamModel)
      .expects('find')
      .withArgs({ _id: { $in: [teamId.toString()] }})
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeams);

    sandbox.mock(EventModel)
      .expects('findByIdAndUpdate')
      .withArgs(eventId, sinon.match({ complete: false }))
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        complete: false,
        form: {
          fields: [{
            name: 'timestamp',
            required: true
          },{
            name: 'geometry',
            required: true
          },{
            name: 'type',
            required: true
          }]
        }
      })
      .expect(200)
      .end(done);
  });
});
