"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , { expect } = require('chai')
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration')
  , { setAttachmentHooks } = require('../../lib/plugins.api/plugins.api.attachments');

const TokenOperations = require('../../lib/models/token');
const TokenModel = mongoose.model('Token');

const UserOperations = require('../../lib/models/user');
const UserModel = mongoose.model('User');

require('sinon-mongoose');

describe("user avatar/icon content-scan tests", function () {

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
    setAttachmentHooks([]);
  });

  const userId = new mongoose.Types.ObjectId();

  function authenticateAsUser(mockUser) {
    const token = {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: { populate: () => Promise.resolve(mockUser) }
    };
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: '12345' })
      .chain('populate', 'userId')
      .chain('exec')
      .resolves(token);
  }

  it('should reject an avatar upload flagged by a content-scanning hook', function (done) {
    setAttachmentHooks([async () => ({ outcome: 'reject', reason: 'Eicar-Test-Signature' })]);

    authenticateAsUser(new UserModel({ _id: userId, username: 'test', displayName: 'test', active: true, roleId: new mongoose.Types.ObjectId() }));

    request(app)
      .put('/api/users/myself')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .attach('avatar', Buffer.from('irrelevant bytes'), 'avatar.png')
      .expect(400)
      .expect(res => res.text.should.match(/avatar upload rejected: Eicar-Test-Signature/))
      .end(done);
  });

});