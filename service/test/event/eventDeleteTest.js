const request = require('supertest');
const sinon = require('sinon');
const mongoose = require('mongoose');
const mockfs = require('mock-fs');
const { expect } = require('chai');
const MockToken = require('../mockToken');
const TokenModel = mongoose.model('Token');

require('chai').should();
require('sinon-mongoose');

require('../../lib/models/team');
var TeamModel = mongoose.model('Team');

require('../../lib/models/event');
var EventModel = mongoose.model('Event');

require('../../lib/models/icon');
var IconModel = mongoose.model('Icon');

require('../../lib/models/user');
var UserModel = mongoose.model('User');

const SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

describe('deleting events', function() {

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

    app = require('../../lib/express').app;
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

  it('deletes the event and all related resources', function(done) {

    mockTokenWithPermission('DELETE_EVENT');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      collectionName: 'observations1'
    })
    const eventRemoveSpy = sinon.spy(mockEvent, 'remove')

    sinon.mock(EventModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockEvent)
      .onSecondCall()
      .yields(null, null);

    const droppedObservationCollection = sinon.mock(mongoose.connection.db)
      .expects('dropCollection')
      .yields(null);

    sinon.mock(IconModel)
      .expects('findOne')
      .yields(null);

    sinon.mock(IconModel)
      .expects('remove')
      .yields(null);

    var teamId = mongoose.Types.ObjectId();
    var mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      teamEventId: eventId
    });

    var removeEventsFromUserExpectation = sinon.mock(UserModel)
      .expects('update')
      .withArgs({}, { $pull: { recentEventIds: eventId } }, { multi: true })
      .yields(null);

    mockfs({
      '/var/lib/mage': {}
    });

    sinon.mock(TeamModel)
      .expects('find')
      .chain('populate')
      .chain('exec')
      .yields(null, [mockTeam]);

    var removedEventTeam = sinon.mock(mockTeam)
      .expects('remove')
      .yields(null);

    request(app)
      .delete('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(204)
      .end(function(err) {
        droppedObservationCollection.verify();
        removedEventTeam.verify();
        removeEventsFromUserExpectation.verify();
        expect(eventRemoveSpy.callCount).to.equal(1);
        mockfs.restore();
        done(err);
      });
  });

  it("should delete event if delete permission in acl", function(done) {
    mockTokenWithPermission('');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      collectionName: 'observations1',
      acl: {}
    });
    mockEvent.acl[userId] = 'OWNER';

    sinon.mock(EventModel)
      .expects('findById')
      .twice()
      .onFirstCall()
      .yields(null, mockEvent)
      .onSecondCall()
      .yields(null, null);

    sinon.mock(EventModel.collection)
      .expects('remove')
      .yields(null);

    sinon.mock(mongoose.connection.db)
      .expects('dropCollection')
      .yields(null);

    sinon.mock(IconModel)
      .expects('findOne')
      .yields(null);

    sinon.mock(IconModel)
      .expects('remove')
      .yields(null);

    var teamId = mongoose.Types.ObjectId();
    var mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      teamEventId: 1
    });

    var removeEventsFromUserExpectation = sinon.mock(UserModel)
      .expects('update')
      .withArgs({}, { $pull: { recentEventIds: eventId } }, { multi: true })
      .yields(null);

    mockfs({
      '/var/lib/mage': {}
    });

    sinon.mock(TeamModel)
      .expects('find')
      .chain('populate')
      .chain('exec')
      .yields(null, [mockTeam]);

    var removeTeamsFromEventExpectation = sinon.mock(EventModel)
      .expects('update')
      .withArgs({}, { $pull: { teamIds: teamId } })
      .yields(null, [mockTeam]);

    var removeTeamExpectation = sinon.mock(TeamModel.collection)
      .expects('remove')
      .yields(null);

    request(app)
      .delete('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(204)
      .end(function(err) {
        removeTeamExpectation.verify();
        removeEventsFromUserExpectation.verify();
        removeTeamsFromEventExpectation.verify();

        mockfs.restore();
        done(err);
      });
  });

  it("should reject event delete if no delete permission in acl", function(done) {
    mockTokenWithPermission('');

    var eventId = 1;
    var mockEvent = new EventModel({
      _id: eventId,
      name: 'Mock Event',
      collectionName: 'observations1',
      acl: [{
        role: 'MANAGER',
        userId: userId
      }]
    });
    sinon.mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    request(app)
      .delete('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(403)
      .end(done);
  });
});
