"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , { expect } = require('chai')
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration')
  , { setAttachmentHooks } = require('../../lib/plugins.api/plugins.api.attachments')
  , fs = require('fs-extra');

require('../../lib/models/role');
const RoleModel = mongoose.model('Role');

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

  it('should reject an icon upload flagged by a content-scanning hook', function (done) {
    setAttachmentHooks([async () => ({ outcome: 'reject', reason: 'Eicar-Test-Signature' })]);

    const targetId = new mongoose.Types.ObjectId();
    const caller = new UserModel({
      _id: userId, username: 'test', displayName: 'test', active: true,
      roleId: new RoleModel({ _id: new mongoose.Types.ObjectId(), permissions: ['UPDATE_USER'] })
    });
    authenticateAsUser(caller);

    const target = new UserModel({ _id: targetId, username: 'target', displayName: 'target', active: true, roleId: new mongoose.Types.ObjectId() });
    sinon.mock(UserModel)
      .expects('findById')
      .withArgs(targetId.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(target);

    request(app)
      .put('/api/users/' + targetId.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .attach('icon', Buffer.from('irrelevant bytes'), 'icon.png')
      .expect(400)
      .expect(res => res.text.should.match(/icon upload rejected: Eicar-Test-Signature/))
      .end(done);
  });

  it('should persist the avatar and return 200 when the scan passes', function (done) {
    setAttachmentHooks([async () => ({ outcome: 'pass' })]);

    const mockUser = new UserModel({ _id: userId, username: 'test', displayName: 'test', active: true, roleId: new mongoose.Types.ObjectId() });
    authenticateAsUser(mockUser);

    sinon.mock(fs).expects('move').yields(null);
    sinon.mock(mockUser).expects('save').resolves(mockUser);
    sinon.mock(mockUser).expects('populate').resolves(mockUser);

    request(app)
      .put('/api/users/myself')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .attach('avatar', Buffer.from('clean bytes'), 'avatar.png')
      .expect(200)
      .end(done);
  });

  it('should return 400 without retrying when the scan hook itself errors', function (done) {
    setAttachmentHooks([async () => { throw new Error('clamd unreachable'); }]);

    authenticateAsUser(new UserModel({ _id: userId, username: 'test', displayName: 'test', active: true, roleId: new mongoose.Types.ObjectId() }));

    request(app)
      .put('/api/users/myself')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .attach('avatar', Buffer.from('irrelevant bytes'), 'avatar.png')
      .expect(400)
      .expect(res => res.text.should.match(/avatar scan failed: clamd unreachable/))
      .end(done);
  });

  it('should reject an oversized avatar upload with 400', function (done) {
    authenticateAsUser(new UserModel({ _id: userId, username: 'test', displayName: 'test', active: true, roleId: new mongoose.Types.ObjectId() }));

    request(app)
      .put('/api/users/myself')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .attach('avatar', Buffer.alloc(1024 * 1024 + 1), 'avatar.png')
      .expect(400)
      .expect(res => res.text.should.match(/exceeds maximum size/))
      .end(done);
  });

});