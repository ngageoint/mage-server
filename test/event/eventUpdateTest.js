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
        forms: [{
          id: 1,
          fields: []
        }]
      })
      .expect(400)
      .expect(function(res) {
        var error = res.text;
        should.exist(error);
        error.should.be.a('string');
        error = JSON.parse(error);
        error.should.have.property('message').that.contains("Validation failed");
        var errors = error.errors;
        should.exist(errors['forms.0.fields']);
        errors['forms.0.fields'].should.have.property('path').that.equals('forms.0.fields');
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

    sandbox.mock(EventModel.collection)
      .expects('findAndModify')
      .yields(null);

    request(app)
      .put('/api/events/1')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        forms: [{
          id: 1,
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
        }]
      })
      .expect(400)
      .expect(function(res) {
        var error = res.text;
        should.exist(error);
        error.should.be.a('string');
        error = JSON.parse(error);

        error.should.have.property('message').that.contains("Validation failed");
        var errors = error.errors;
        should.exist(errors['forms.0.fields.3.type']);
        errors['forms.0.fields.3.type'].should.have.property('message').that.equals("`invalid` is not a valid enum value for path `type`.");
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
      .post('/api/events/' + eventId + '/teams/')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        team: {id: teamId.toString()}
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

  it("should update event if update access in acl", function(done) {
    mockTokenWithPermission('');

    var eventId = 1;
    var acl = {};
    acl[userId.toString()] = 'MANAGER';
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      acl: acl
    });
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    sandbox.mock(EventModel)
      .expects('findByIdAndUpdate')
      .withArgs(eventId)
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Updated Mock Event'
      })
      .expect(200)
      .end(done);
  });


  it("should reject update to event if not in acl", function(done) {
    mockTokenWithPermission('');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      acl: {}
    });
    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Updated Mock Event'
      })
      .expect(403)
      .end(done);
  });

  it("should reject update to event if no update access in acl", function(done) {
    mockTokenWithPermission('');

    var eventId = 1;
    var acl = {};
    acl[userId.toString()] = 'GUEST';
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      acl: acl
    });

    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Updated Mock Event'
      })
      .expect(403)
      .end(done);
  });

  it("should update user in acl for event", function(done) {
    mockTokenWithPermission('');
    var aclUserId = mongoose.Types.ObjectId();

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

    var eventId = 1;
    var acl = {};
    acl[userId.toString()] = 'MANAGER';
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      acl: acl
    });

    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var eventUpdate = {};
    eventUpdate['acl.' + aclUserId.toString()] = 'OWNER';
    sandbox.mock(EventModel)
      .expects('findOneAndUpdate')
      .withArgs({_id: eventId}, eventUpdate)
      .yields(null, mockTeam);

    var mockTeam = new TeamModel({
      name: 'Mock Team'
    });
    sandbox.mock(TeamModel)
      .expects('findOne')
      .withArgs({teamEventId: eventId})
      .yields(null, mockTeam);

    var teamUpdate = {};
    teamUpdate['acl.' + aclUserId.toString()] = 'OWNER';
    sandbox.mock(TeamModel)
      .expects('findOneAndUpdate')
      .withArgs({teamEventId: eventId}, teamUpdate)
      .yields(null, mockTeam);

    request(app)
      .put('/api/events/' + eventId + '/acl/' + aclUserId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        role: 'OWNER'
      })
      .expect(200)
      .end(done);
  });

  it("should delete user in acl for event", function(done) {
    mockTokenWithPermission('');
    var aclUserId = mongoose.Types.ObjectId();

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

    var eventId = 1;
    var acl = {};
    acl[userId.toString()] = 'MANAGER';
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      acl: acl
    });

    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var eventUpdate = { $unset: {} };
    eventUpdate.$unset['acl.' + aclUserId.toString()] = true;
    sandbox.mock(EventModel)
      .expects('findOneAndUpdate')
      .withArgs({_id: eventId}, eventUpdate)
      .yields(null, mockTeam);

    var mockTeam = new TeamModel({
      name: 'Mock Team'
    });
    sandbox.mock(TeamModel)
      .expects('findOne')
      .withArgs({teamEventId: eventId})
      .yields(null, mockTeam);

    var teamUpdate = { $unset: {} };
    teamUpdate.$unset['acl.' + aclUserId.toString()] = true;
    sandbox.mock(TeamModel)
      .expects('findOneAndUpdate')
      .withArgs({teamEventId: eventId}, teamUpdate)
      .yields(null, mockTeam);

    request(app)
      .delete('/api/events/' + eventId + '/acl/' + aclUserId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send()
      .expect(200)
      .end(done);
  });

  it("should reject update user in acl for event with invalid userId", function(done) {
    mockTokenWithPermission('');

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

    var eventId = 1;
    var acl = {};
    acl[userId.toString()] = 'MANAGER';
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      acl: acl
    });

    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId + '/acl/1')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        role: 'OWNER'
      })
      .expect(400)
      .end(done);
  });

  it("should reject update user in acl for event with invalid role", function(done) {
    mockTokenWithPermission('');

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

    var eventId = 1;
    var acl = {};
    acl[userId.toString()] = 'MANAGER';
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      acl: acl
    });

    sandbox.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId + '/acl/' + mongoose.Types.ObjectId())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        role: 'NOTHING'
      })
      .expect(400)
      .end(done);
  });

});
