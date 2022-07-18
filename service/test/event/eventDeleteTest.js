'use strict';

const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , mockfs = require('mock-fs')
  , { expect } = require('chai')
  , createToken = require('../mockToken')
  , IconModel = require('../../lib/models/icon')
  , TokenModel = require('../../lib/models/token')
  , UserModel = require('../../lib/models/user')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('sinon-mongoose');

require('../../lib/models/team');
const TeamModel = mongoose.model('Team');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

describe('deleting events', function () {

  let app;

  beforeEach(function () {
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

  afterEach(function () {
    sinon.restore();
  });

  const userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission]));
  }

  it('deletes the event and all related resources', function (done) {

    mockTokenWithPermission('DELETE_EVENT');

    const eventId = 1;
    const mockEvent = new EventModel({
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
      .expects('getIcon')
      .yields(null);

    sinon.mock(IconModel)
      .expects('remove')
      .yields(null);

    const teamId = mongoose.Types.ObjectId();
    const mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      teamEventId: eventId
    });

    sinon.mock(UserModel)
      .expects('removeRecentEventForUsers')
      .yields(null);

    mockfs({
      '/var/lib/mage': {}
    });

    sinon.mock(TeamModel)
      .expects('find')
      .chain('populate')
      .chain('exec')
      .yields(null, [mockTeam]);

    const removedEventTeam = sinon.mock(mockTeam)
      .expects('remove')
      .yields(null);

    request(app)
      .delete('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(204)
      .end(function (err) {
        droppedObservationCollection.verify();
        removedEventTeam.verify();
        expect(eventRemoveSpy.callCount).to.equal(1);
        mockfs.restore();
        done(err);
      });
  });

  it("should delete event if delete permission in acl", function (done) {
    mockTokenWithPermission('');

    const eventId = 1;
    const mockEvent = new EventModel({
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
      .expects('deleteOne')
      .yields(null);

    sinon.mock(mongoose.connection.db)
      .expects('dropCollection')
      .yields(null);

    sinon.mock(IconModel)
      .expects('getIcon')
      .yields(null);

    sinon.mock(IconModel)
      .expects('remove')
      .yields(null);

    const teamId = mongoose.Types.ObjectId();
    const mockTeam = new TeamModel({
      _id: teamId,
      name: 'Mock Team',
      teamEventId: 1
    });

    sinon.mock(UserModel)
      .expects('removeRecentEventForUsers')
      .yields(null);

    mockfs({
      '/var/lib/mage': {}
    });

    sinon.mock(TeamModel)
      .expects('find')
      .chain('populate')
      .chain('exec')
      .yields(null, [mockTeam]);

    const removeTeamsFromEventExpectation = sinon.mock(EventModel)
      .expects('update')
      .withArgs({}, { $pull: { teamIds: teamId } })
      .yields(null, [mockTeam]);

    const removeTeamExpectation = sinon.mock(TeamModel.collection)
      .expects('deleteOne')
      .yields(null);

    request(app)
      .delete('/api/events/' + eventId)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(204)
      .end(function (err) {
        removeTeamExpectation.verify();
        removeTeamsFromEventExpectation.verify();

        mockfs.restore();
        done(err);
      });
  });

  it("should reject event delete if no delete permission in acl", function (done) {
    mockTokenWithPermission('');

    const eventId = 1;
    const mockEvent = new EventModel({
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
