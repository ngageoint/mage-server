var request = require('supertest')
  , should = require('chai').should()
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , MockToken = require('../mockToken')
  , TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../models/team');
var TeamModel = mongoose.model('Team');

require('../../models/event');
var EventModel = mongoose.model('Event');

const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

describe("event update tests", function() {

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

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it("should update event", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    sinon.mock(EventModel)
      .expects('findByIdAndUpdate')
      .withArgs(eventId, { name: 'Mock Event', description: 'Mock Event Description' })
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        description: 'Mock Event Description'
      })
      .expect(200)
      .end(done);
  });

  it("should remove event description", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    sinon.mock(EventModel)
      .expects('findByIdAndUpdate')
      .withArgs(eventId, { name: 'Mock Event', description: null })
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        description: null
      })
      .expect(200)
      .end(done);
  });

  it("should reject event with no fields", function(done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    sinon.mock(EventModel)
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

    sinon.mock(TeamModel)
      .expects('find')
      .withArgs({ _id: { $in: [teamId.toString()] }})
      .chain('populate')
      .chain('exec')
      .yields(null, mockTeams);

    sinon.mock(EventModel.collection)
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
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, new EventModel({
        _id: eventId,
        name: 'testEvent'
      }));

    sinon.mock(EventModel.collection)
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
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var teamId = mongoose.Types.ObjectId();
    sinon.mock(EventModel)
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
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var teamId = mongoose.Types.ObjectId();
    var mockTeams = [{
      id: mongoose.Types.ObjectId(),
      name: 'Mock Team',
      teamEventId: 2
    }];

    sinon.mock(TeamModel)
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
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    sinon.mock(EventModel)
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
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    sinon.mock(EventModel)
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
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    sinon.mock(EventModel)
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
    sinon.mock(EventModel)
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

    sinon.mock(EventModel)
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

    sinon.mock(TeamModel)
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

    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var eventUpdate = {};
    eventUpdate['acl.' + aclUserId.toString()] = 'OWNER';
    sinon.mock(EventModel)
      .expects('findOneAndUpdate')
      .withArgs({_id: eventId}, eventUpdate)
      .yields(null, mockTeam);

    var mockTeam = new TeamModel({
      name: 'Mock Team'
    });
    sinon.mock(TeamModel)
      .expects('findOne')
      .withArgs({teamEventId: eventId})
      .yields(null, mockTeam);

    var teamUpdate = {};
    teamUpdate['acl.' + aclUserId.toString()] = 'OWNER';
    sinon.mock(TeamModel)
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

    sinon.mock(TeamModel)
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

    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    var eventUpdate = { $unset: {} };
    eventUpdate.$unset['acl.' + aclUserId.toString()] = true;
    sinon.mock(EventModel)
      .expects('findOneAndUpdate')
      .withArgs({_id: eventId}, eventUpdate)
      .yields(null, mockTeam);

    var mockTeam = new TeamModel({
      name: 'Mock Team'
    });
    sinon.mock(TeamModel)
      .expects('findOne')
      .withArgs({teamEventId: eventId})
      .yields(null, mockTeam);

    var teamUpdate = { $unset: {} };
    teamUpdate.$unset['acl.' + aclUserId.toString()] = true;
    sinon.mock(TeamModel)
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

    sinon.mock(TeamModel)
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

    sinon.mock(EventModel)
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

    sinon.mock(TeamModel)
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

    sinon.mock(EventModel)
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

  it("should update event with valid form restrictions", function (done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    sinon.mock(EventModel)
      .expects('findByIdAndUpdate')
      .withArgs(eventId, sinon.match.has('name', 'Mock Event'))
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        minObservationForms: 1,
        maxObservationForms: 5,
        forms: [{
          id: 1,
          min: 1,
          max: 2
        },{
          id: 2,
          min: 1,
          max: 2
        }]
      })
      .expect(200)
      .end(done);
  });

  it("should fail to update event when minObservationForms greater than maxObservationForms", function (done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        minObservationForms: 2,
        maxObservationForms: 1
      })
      .expect(400)
      .expect(function (res) {
        should.exist(res.error.text);
        const error = JSON.parse(res.error.text);
        error.errors.minMax.error.should.equal('value')
        error.errors.minMax.message.should.equal('The minimum forms per observation must be less than or equal to the maximum forms per observation.')
      })
      .end(done);
  });

  it("should fail to update event when maxObservationForms is less then sum of the minimum of all individual forms", function (done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        maxObservationForms: 1,
        forms: [{
          id: 1,
          min: 1
        }, {
          id: 2,
          min: 1
        }]
      })
      .expect(400)
      .expect(function (res) {
        should.exist(res.error.text);
        const error = JSON.parse(res.error.text);
        error.errors.maxObservationForms.error.should.equal('value')
        error.errors.maxObservationForms.message.should.equal('The maximum forms per observation must be equal to or greater than the sum of the minimum of all individual forms.')
      })
      .end(done);
  });

  it("should fail to update event when minObservationForms is greater then sum of the maximum of all individual forms", function (done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        minObservationForms: 4,
        forms: [{
          id: 1,
          max: 1
        }, {
          id: 2,
          max: 1
        }]
      })
      .expect(400)
      .expect(function (res) {
        should.exist(res.error.text);
        const error = JSON.parse(res.error.text);
        error.errors.minObservationForms.error.should.equal('value')
        error.errors.minObservationForms.message.should.equal('The minimum forms per observation must be equal to or less than the sum of the maximum of all individual forms.')
      })
      .end(done);
  });

  it("should fail to update event when individual form min is greater than max", function (done) {
    mockTokenWithPermission('UPDATE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event'
    });
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    request(app)
      .put('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        name: 'Mock Event',
        forms: [{
          id: 1,
          name: 'Form 1',
          min: 2,
          max: 1
        }, {
          id: 2,
          max: 1,
          min: 1
        }]
      })
      .expect(400)
      .expect(function (res) {
        should.exist(res.error.text);
        const error = JSON.parse(res.error.text);
        error.errors.form1minMax.error.should.equal('value')
        error.errors.form1minMax.message.should.equal('Form 1 form minimum must be less than or equal to the maximum.')
      })
      .end(done);
  });

});
