'use strict';

const request = require('supertest'),
  sinon = require('sinon'),
  should = require('chai').should(),
  mongoose = require('mongoose'),
  Token = require('../../lib/models/token'),
  createToken = require('../mockToken'),
  SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender'),
  AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration'),
  Authentication = require('../../lib/models/authentication'),
  Role = require('../../lib/models/role'),
  { setAttachmentHooks } = require('../../lib/plugins.api/plugins.api.attachments'),
  fs = require('fs-extra');

require('../../lib/models/user');
const UserModel = mongoose.model('User');

require('sinon-mongoose');

const pbkdf2Path = require.resolve('../../lib/utilities/pbkdf2');
const originalPbkdf2Factory = require(pbkdf2Path);

let app;

function purgeAppModules() {
  Object.keys(require.cache).forEach((key) => {
    const normalized = key.replace(/\\/g, '/');
    if (
      normalized.includes('/lib/express') ||
      normalized.includes('/lib/routes/users')
    ) {
      delete require.cache[key];
    }
  });
}

function installDeterministicHasher() {
  require.cache[pbkdf2Path].exports = function () {
    return {
      hashPassword(value, cb) {
        cb(null, `hash:${String(value)}`);
      },
      validPassword(value, hash, cb) {
        cb(null, hash === `hash:${String(value)}`);
      }
    };
  };
}

describe('user create tests - POST /api/users avatar/icon content-scan', function () {

  const userId = new mongoose.Types.ObjectId();

  beforeEach(function () {
    const config = {
      name: 'local',
      type: 'local'
    };

    sinon
      .mock(AuthenticationConfiguration)
      .expects('getAllConfigurations')
      .resolves([config]);

    sinon
      .mock(SecurePropertyAppender)
      .expects('appendToConfig')
      .resolves(config);

    sinon
      .mock(Role)
      .expects('getRole')
      .yields(null, {
        permissions: ['SOME_PERMISSIONS']
      });

    installDeterministicHasher();
    purgeAppModules();
    app = require('../../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
    setAttachmentHooks([]);
    require.cache[pbkdf2Path].exports = originalPbkdf2Factory;
    purgeAppModules();
  });

  function mockTokenWithPermission(permission) {
    sinon
      .mock(Token)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission]));
  }

  function buildMockUser(id, roleId) {
    return new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'passwordpassword',
      passwordconfirm: 'passwordpassword',
      roleId: roleId,
      authenticationId: new Authentication.Local({
        _id: new mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: new mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {
            usersReqAdmin: true
          }
        }),
        security: {}
      })
    });
  }

  function mockCreateCollaborators(mockUser) {
    sinon
      .mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .resolves(null);

    sinon
      .mock(AuthenticationConfiguration.Model)
      .expects('findOne')
      .chain('exec')
      .resolves(mockUser.authentication.authenticationConfiguration);

    sinon
      .mock(Authentication)
      .expects('createAuthentication')
      .resolves(mockUser.authentication);

    sinon
      .mock(mockUser)
      .expects('populate')
      .atLeast(1)
      .resolves(mockUser);

    sinon
      .mock(UserModel)
      .expects('create')
      .withArgs(sinon.match.has('active', true))
      .resolves(mockUser);
  }

  it('should create the user but not attach an avatar flagged by a content-scanning hook', function (done) {
    setAttachmentHooks([async () => ({ outcome: 'reject', reason: 'Eicar-Test-Signature' })]);
    mockTokenWithPermission('CREATE_USER');

    const id = new mongoose.Types.ObjectId();
    const roleId = new mongoose.Types.ObjectId();
    const mockUser = buildMockUser(id, roleId);
    mockCreateCollaborators(mockUser);

    sinon.mock(fs).expects('remove').withArgs(sinon.match.string).resolves();

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .field('username', 'test')
      .field('displayName', 'test')
      .field('password', 'passwordpassword')
      .field('passwordconfirm', 'passwordpassword')
      .field('roleId', roleId.toString())
      .attach('avatar', Buffer.from('irrelevant bytes'), 'avatar.png')
      .expect(200)
      .expect(function (res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
        user.should.not.have.property('avatar');
      })
      .end(done);
  });

  it('should create the user but not attach an icon when the scan hook itself errors', function (done) {
    setAttachmentHooks([async () => { throw new Error('clamd unreachable'); }]);
    mockTokenWithPermission('CREATE_USER');

    const id = new mongoose.Types.ObjectId();
    const roleId = new mongoose.Types.ObjectId();
    const mockUser = buildMockUser(id, roleId);
    mockCreateCollaborators(mockUser);

    sinon.mock(fs).expects('remove').withArgs(sinon.match.string).resolves();

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .field('username', 'test')
      .field('displayName', 'test')
      .field('password', 'passwordpassword')
      .field('passwordconfirm', 'passwordpassword')
      .field('roleId', roleId.toString())
      .field('icon[type]', 'upload')
      .attach('icon', Buffer.from('irrelevant bytes'), 'icon.png')
      .expect(200)
      .expect(function (res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      })
      .end(done);
  });

  it('should create the user and persist the avatar when the scan passes', function (done) {
    setAttachmentHooks([async () => ({ outcome: 'pass' })]);
    mockTokenWithPermission('CREATE_USER');

    const id = new mongoose.Types.ObjectId();
    const roleId = new mongoose.Types.ObjectId();
    const mockUser = buildMockUser(id, roleId);
    mockCreateCollaborators(mockUser);

    sinon.mock(fs).expects('move').resolves();
    sinon.mock(mockUser).expects('save').resolves(mockUser);

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .field('username', 'test')
      .field('displayName', 'test')
      .field('password', 'passwordpassword')
      .field('passwordconfirm', 'passwordpassword')
      .field('roleId', roleId.toString())
      .attach('avatar', Buffer.from('clean bytes'), 'avatar.png')
      .expect(200)
      .expect(function (res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      })
      .end(done);
  });

});
