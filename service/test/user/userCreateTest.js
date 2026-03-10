'use strict';

const request = require('supertest'),
  sinon = require('sinon'),
  should = require('chai').should(),
  expect = require('chai').expect,
  mongoose = require('mongoose'),
  createToken = require('../mockToken'),
  Token = require('../../lib/models/token'),
  SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender'),
  AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration'),
  Authentication = require('../../lib/models/authentication');

require('../../lib/models/user');
const UserModel = mongoose.model('User');

require('../../lib/models/team');
const TeamModel = mongoose.model('Team');

const Role = require('../../lib/models/role');
const RoleModel = mongoose.model('Role');

require('../../lib/models/event');
const EventModel = mongoose.model('Event');

const captchaCanvas = require('captcha-canvas');

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
  require.cache[pbkdf2Path].exports = function() {
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

async function captcha(username = 'test') {
  let jwt;
  await request(app)
    .post('/api/users/signups')
    .set('Accept', 'application/json')
    .send({ username })
    .expect(200)
    .expect(function(res) {
      jwt = res.body.token;
      res.body.should.have.property('captcha');
    });

  return jwt;
}

describe('user create tests', function() {
  beforeEach(function() {
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

    sinon.stub(captchaCanvas, 'createCaptchaSync').returns({
      text: 'captcha',
      image: Buffer.from('image')
    });

    installDeterministicHasher();
    purgeAppModules();
    app = require('../../lib/express').app;
  });

  afterEach(function() {
    sinon.restore();
    require.cache[pbkdf2Path].exports = originalPbkdf2Factory;
    purgeAppModules();
  });

  const userId = mongoose.Types.ObjectId();

  function mockTokenWithPermission(permission) {
    sinon
      .mock(Token)
      .expects('getToken')
      .withArgs('12345')
      .yields(null, createToken(userId, [permission]));
  }

  it('should create user as admin', function(done) {
    mockTokenWithPermission('CREATE_USER');

    const id = mongoose.Types.ObjectId();
    const roleId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'password',
      passwordconfirm: 'password',
      roleId: roleId,
      authenticationId: new Authentication.Local({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {
            usersReqAdmin: true
          }
        }),
        security: {}
      })
    });

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
      .yields(null, mockUser);

    sinon
      .mock(UserModel)
      .expects('create')
      .withArgs(sinon.match.has('active', true))
      .yields(null, mockUser);

    sinon
      .mock(mockUser)
      .expects('save')
      .yields(null, mockUser);

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        roleId: roleId
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      })
      .end(function(err) {
        if (err) return done(err);
        done();
      });
  });

  it('should fail to create user as admin w/o roleId', function(done) {
    mockTokenWithPermission('CREATE_USER');

    sinon
      .mock(AuthenticationConfiguration.Model)
      .expects('findOne')
      .chain('exec')
      .resolves({
        settings: {
          usersReqAdmin: { enabled: true }
        }
      });

    request(app)
      .post('/api/users')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('roleId is a required field');
      })
      .end(done);
  });

  it('should create captcha', function(done) {
    request(app)
      .post('/api/users/signups')
      .set('Accept', 'application/json')
      .send({
        username: 'test'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        should.exist(res.body);
        res.body.should.have.property('token');
        res.body.should.have.property('captcha');
      })
      .end(done);
  });

  it('should fail to create captcha with no username', function(done) {
    request(app)
      .post('/api/users/signups')
      .set('Accept', 'application/json')
      .send({})
      .expect(400)
      .end(done);
  });

  it('should create user', async function() {
    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'passwordpassword',
      passwordconfirm: 'passwordpassword',
      authenticationId: new Authentication.Local({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {
            usersReqAdmin: true
          }
        }),
        security: {}
      })
    });

    const jwt = await captcha('test');

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
      .mock(UserModel)
      .expects('findById')
      .chain('populate', 'roleId')
      .chain('populate', {
        path: 'authenticationId',
        populate: { path: 'authenticationConfigurationId' }
      })
      .yields(null, mockUser);

    sinon
      .mock(UserModel)
      .expects('populate')
      .yields(null, mockUser);

    sinon
      .mock(UserModel)
      .expects('create')
      .yields(null, mockUser);

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        phone: '000-000-0000',
        email: 'test@test.com',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      });
  });

  it('should create user and default admin approval to true', async function() {
    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'passwordpassword',
      passwordconfirm: 'passwordpassword',
      authenticationId: new Authentication.Local({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {}
        }),
        security: {}
      })
    });

    const jwt = await captcha('test');

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
      .mock(UserModel)
      .expects('findById')
      .chain('populate', 'roleId')
      .chain('populate', {
        path: 'authenticationId',
        populate: { path: 'authenticationConfigurationId' }
      })
      .yields(null, mockUser);

    sinon
      .mock(mockUser)
      .expects('populate')
      .yields(null, mockUser);

    sinon
      .mock(UserModel)
      .expects('create')
      .withArgs(sinon.match.has('active', false))
      .yields(null, mockUser);

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        phone: '000-000-0000',
        email: 'test@test.com',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      });
  });

  it('should create user with no whitespace', async function() {
    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'passwordpassword',
      passwordconfirm: 'passwordpassword',
      authenticationId: new Authentication.Local({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {
            usersReqAdmin: true
          }
        }),
        security: {}
      })
    });

    const jwt = await captcha(' test ');

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
      .mock(UserModel)
      .expects('findById')
      .chain('populate', 'roleId')
      .chain('populate', {
        path: 'authenticationId',
        populate: { path: 'authenticationConfigurationId' }
      })
      .yields(null, mockUser);

    sinon
      .mock(mockUser)
      .expects('populate')
      .yields(null, mockUser);

    sinon
      .mock(UserModel)
      .expects('create')
      .withArgs(sinon.match.has('username', 'test'))
      .yields(null, mockUser);

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        phone: '000-000-0000',
        email: 'test@test.com',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      });
  });

  it('should create user and default event', async function() {
    const mockEvent = new EventModel({
      _id: 1,
      name: 'Mock Event',
      acl: {}
    });

    sinon
      .mock(EventModel)
      .expects('findById')
      .yields(null, mockEvent);

    const teamId = mongoose.Types.ObjectId();
    const mockTeam = new TeamModel({
      id: teamId,
      name: 'Mock Team',
      teamEventId: mockEvent._id
    });

    const mockTeamModel = sinon.mock(TeamModel);
    mockTeamModel
      .expects('findOne')
      .withArgs({ teamEventId: mockEvent._id })
      .resolves(mockTeam);
    mockTeamModel
      .expects('findByIdAndUpdate')
      .yields(null, mockTeam);

    sinon
      .mock(RoleModel)
      .expects('findOne')
      .withArgs({ name: 'USER_ROLE' })
      .yields(
        null,
        new RoleModel({
          permissions: ['SOME_PERMISSIONS']
        })
      );

    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      password: 'passwordpassword',
      passwordconfirm: 'passwordpassword',
      authenticationId: new Authentication.Local({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {
            newUserEvents: [1]
          }
        }),
        security: {}
      })
    });

    const jwt = await captcha('test');

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
      .mock(UserModel)
      .expects('findById')
      .chain('populate', 'roleId')
      .chain('populate', {
        path: 'authenticationId',
        populate: { path: 'authenticationConfigurationId' }
      })
      .yields(null, mockUser);

    sinon
      .mock(mockUser)
      .expects('populate')
      .yields(null, mockUser);

    sinon
      .mock(UserModel)
      .expects('create')
      .withArgs(sinon.match.has('active', false))
      .yields(null, mockUser);

    const res = await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        phone: '000-000-0000',
        email: 'test@test.com',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      });

    expect(res.status).to.equal(200);
    expect(res.type).to.match(/json/);
    expect(res.body).to.have.property('id', userId.toString());
  });

  it('should fail to create user with duplicate username', async function() {
    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      password: 'passwordpassword',
      passwordconfirm: 'passwordpassword',
      authenticationId: new Authentication.Local({
        _id: mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {}
        }),
        security: {}
      })
    });

    const jwt = await captcha('test');

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
      .mock(UserModel)
      .expects('findById')
      .chain('populate', 'roleId')
      .chain('populate', {
        path: 'authenticationId',
        populate: { path: 'authenticationConfigurationId' }
      })
      .yields(null, mockUser);

    sinon
      .mock(mockUser)
      .expects('populate')
      .withArgs('roleId')
      .yields(null, mockUser);

    sinon
      .mock(UserModel)
      .expects('findOne')
      .withArgs(sinon.match.has('username', 'test'))
      .yields(null, mockUser);

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        phone: '000-000-0000',
        email: 'test@test.com',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(409);
  });

  it('should fail to create user w/o displayName', async function() {
    const jwt = await captcha('test');

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal(
          "Invalid account document: missing required parameter 'displayName'"
        );
      });
  });

  it('should fail to create user with invalid email', async function() {
    const jwt = await captcha('test');

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        email: 'notvalid',
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('Invalid email address');
      });
  });

  it('should fail to create user w/o password', async function() {
    const jwt = await captcha('test');

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        passwordconfirm: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal(
          "Invalid account document: missing required parameter 'password'"
        );
      });
  });

  it('should fail to create user w/o passwordconfirm', async function() {
    const jwt = await captcha('test');

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        password: 'passwordpassword',
        captchaText: 'captcha'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal(
          "Invalid account document: missing required parameter 'passwordconfirm'"
        );
      });
  });

  it('should fail to create user when passsord and passwordconfirm do not match', async function() {
    const jwt = await captcha('test');

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        password: 'passwordpassword',
        passwordconfirm: 'passwordconfirmpasswordconfirm',
        captchaText: 'captcha'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('Passwords do not match');
      });
  });

  it('should fail to create user when password does not meet complexity', async function() {
    const jwt = await captcha('test');

    const authConfig = {
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      name: 'local',
      settings: {
        passwordPolicy: {
          helpText: 'Password must be at least 14 characters',
          passwordMinLengthEnabled: true,
          passwordMinLength: 14
        }
      }
    };

    sinon
      .mock(AuthenticationConfiguration.Model)
      .expects('findOne')
      .chain('exec')
      .resolves(authConfig);

    sinon
      .mock(AuthenticationConfiguration.Model)
      .expects('findById')
      .chain('exec')
      .resolves(authConfig);

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password',
        captchaText: 'captcha'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('Password must be at least 14 characters');
      });
  });

  it('should fail to create user with no captcha token', async function() {
    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .send({
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password',
        captchaText: 'captcha'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('Bad Request');
      });
  });

  it('should fail to create user with invalid captcha token', async function() {
    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 1')
      .send({
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password',
        captchaText: 'captcha'
      })
      .expect(400)
      .expect(function(res) {
        res.text.should.equal('Invalid captcha, please try again');
      });
  });

  it('should fail to create user with invalid captcha text', async function() {
    const jwt = await captcha('test');

    await request(app)
      .post('/api/users/signups/verifications')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password',
        captchaText: 'wrong'
      })
      .expect(403)
      .expect(function(res) {
        res.text.should.equal('Invalid captcha, please try again.');
      });
  });
});