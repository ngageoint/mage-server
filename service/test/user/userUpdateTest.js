"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , should = require('chai').should()
  , { expect } = require('chai')
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration')
  , Authentication = require('../../lib/models/authentication')
  , { defaultEventPermissionsService: eventPermissions } = require('../../lib/permissions/permissions.events')
  , { EventAccessType } = require('../../lib/entities/events/entities.events');

const TokenOperations = require('../../lib/models/token');
const TokenModel = mongoose.model('Token');

const UserOperations = require('../../lib/models/user');
const UserModel = mongoose.model('User');

require('../../lib/models/role');
const RoleModel = mongoose.model('Role');

const EventOperations = require('../../lib/models/event');
const EventModel = mongoose.model('Event');

require('sinon-mongoose');

describe("user update tests", function () {

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

  const userId = new mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    sinon.mock(TokenOperations)
      .expects('getToken')
      .yields(null, createToken(userId, permissions));
  }

  it('should update myself', function (done) {
    const roleId = new mongoose.Types.ObjectId();
    const mockRole = new RoleModel({
      _id: roleId,
      name: 'User',
      permissions: ['SOME_PERMISSION']
    });
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      roleId: roleId
    });

    const token = {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function () {
          return Promise.resolve(mockUser);
        }
      }
    };

    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .resolves(token);

    sinon.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

    sinon.mock(mockUser)
      .expects('populate')
      .atLeast(1)
      .callsFake(function (paths) {
        const requested = Array.isArray(paths) ? paths : [paths];
        const populatesRole = requested.some(function (p) {
          return p === 'roleId' || (p && p.path === 'roleId');
        });
        if (populatesRole) {
          mockUser.roleId = mockRole;
        }
        return Promise.resolve(mockUser);
      });

    request(app)
      .put('/api/users/myself')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(userId.toString());
        user.should.have.property('role');
        user.role.should.have.property('name', 'User');
      })
      .end(done);
  });

  it('should fail to update myself if passwords do not match', function (done) {
    const mockUser = {
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      enabled: true,
      roleId: new mongoose.Types.ObjectId(),
      authentication: new Authentication.Local({
        _id: new mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        security: {},
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: new mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {}
        })
      })
    }

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', { path: 'authenticationId', populate: { path: 'authenticationConfigurationId' } })
      .chain('exec')
      .resolves(mockUser);

    sinon.mock(Authentication.Local.prototype)
      .expects('validatePassword')
      .yields(null, true);

    sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

    request(app)
      .put('/api/users/myself/password')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        password: 'password',
        newPassword: 'password',
        newPasswordConfirm: 'passwordconfirm'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal('Passwords do not match');
      })
      .end(done);
  });

  it('should fail to update myself if passwords does not meet complexity', function (done) {
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      enabled: true,
      roleId: new mongoose.Types.ObjectId(),
      authenticationId: new Authentication.Local({
        _id: new mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: new mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {
            passwordPolicy: {
              helpText: 'Password must be at least 14 characters',
              passwordMinLengthEnabled: true,
              passwordMinLength: 14
            }
          }
        }),
        security: {}
      })
    });

    sinon.mock(AuthenticationConfiguration.Model)
      .expects('findOne')
      .chain('exec')
      .resolves(mockUser.authentication.authenticationConfiguration);

    sinon.mock(UserModel)
      .expects('findOne')
      .withArgs({ username: 'test' })
      .chain('populate', 'roleId')
      .chain('populate', { path: 'authenticationId', populate: { path: 'authenticationConfigurationId' } })
      .chain('exec')
      .resolves(mockUser);

    sinon.mock(Authentication.Local.prototype)
      .expects('validatePassword')
      .yields(null, true);

    request(app)
      .put('/api/users/myself/password')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        password: 'password',
        newPassword: 'password',
        newPasswordConfirm: 'password'
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal('Password must be at least 14 characters');
      })
      .end(done);
  });

  it('should update user', function (done) {
    mockTokenWithPermission('UPDATE_USER');

    const id = new mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new mongoose.Types.ObjectId()
    });

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

    sinon.mock(mockUser)
      .expects('populate')
      .resolves(mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        active: true,
        roleId: new mongoose.Types.ObjectId()
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      })
      .end(done);
  });

  it('should update user role with UPDATE_USER_ROLE', function (done) {
    sinon.mock(TokenOperations)
      .expects('getToken')
      .yields(null, createToken(userId, ['UPDATE_USER', 'UPDATE_USER_ROLE']));

    const id = new mongoose.Types.ObjectId();
    const roleId = new mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new mongoose.Types.ObjectId()
    });

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(UserOperations)
      .expects('updateUser')
      .withArgs(sinon.match.has('roleId', roleId))
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        active: true,
        roleId: roleId
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      })
      .end(done);
  });

  it('should update user password with UPDATE_USER_ROLE permission', function (done) {
    mockTokenWithPermission(['UPDATE_USER', 'UPDATE_USER_ROLE']);

    const id = new mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      enabled: true,
      authenticationId: new Authentication.Local({
        _id: new mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        security: {}
      })
    });

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(UserOperations)
      .expects('updateUser')
      .withArgs(sinon.match.has('authentication', sinon.match.has('password', 'passwordpassword')))
      .yields(null, mockUser);

    sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

    request(app)
      .put('/api/users/' + id.toString() + '/password')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
      })
      .expect(200)
      .end(done);
  });

  it('should fail to update user password w/o UPDATE_USER_ROLE permission', function (done) {
    mockTokenWithPermission('UPDATE_USER');

    const id = new mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      enabled: true,
      authenticationId: new Authentication.Local({
        _id: new mongoose.Types.ObjectId(),
        type: 'local',
        password: undefined,
        security: {}
      })
    });

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    request(app)
      .put('/api/users/' + id.toString() + '/password')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword'
      })
      .expect(403)
      .end(done);
  });

  it('fails to update the user password without the passwordconfirm parameter', function (done) {
    mockTokenWithPermission('UPDATE_USER_ROLE');

    const id = new mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new Authentication.Local({
        _id: new mongoose.Types.ObjectId(),
        type: 'local',
        password: undefined,
        security: {}
      })
    });

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(UserOperations)
      .expects('updateUser').never();

    request(app)
      .put('/api/users/' + id.toString() + '/password')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        password: 'passwordpassword',
      })
      .expect(400)
      .expect(res => {
        expect(res.text).to.equal(`passwordconfirm is required`);
      })
      .end(done);
  });

  it('should fail to update user role w/o UPDATE_USER_ROLE', function (done) {
    mockTokenWithPermission(['UPDATE_USER']);

    const id = new mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new mongoose.Types.ObjectId()
    });

    mockUser.authentication = {
      _id: mockUser.authenticationId,
      type: 'local',
      security: {}
    }

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(UserOperations)
      .expects('updateUser')
      .withArgs(sinon.match.has('roleId', undefined))
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        email: 'test@test.com',
        phone: '000-000-0000',
        active: true,
        password: 'passwordpassword',
        passwordconfirm: 'passwordpassword',
        roleId: new mongoose.Types.ObjectId()
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        var user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(id.toString());
      })
      .end(done);
  });

  it('should activate user', function (done) {
    mockTokenWithPermission('UPDATE_USER');

    const id = new mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      authenticationId: new mongoose.Types.ObjectId()
    });

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(UserOperations)
      .expects('updateUser')
      .withArgs(sinon.match({ active: true }))
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        active: 'true'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done);
  });

  it('should disable user', function (done) {
    mockTokenWithPermission('UPDATE_USER');

    const id = new mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      authenticationId: new mongoose.Types.ObjectId()
    });

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(UserOperations)
      .expects('updateUser')
      .withArgs(sinon.match({ enabled: false }))
      .yields(null, mockUser);

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        enabled: 'false'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done);
  });

  it('should remove token if user is inactive', function (done) {
    mockTokenWithPermission('UPDATE_USER');

    const id = new mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: false,
      enabled: true,
      roleId: new mongoose.Types.ObjectId(),
      authenticationId: new mongoose.Types.ObjectId()
    });

    // mock variable used by mongoose to determine if this is a create or update
    mockUser.isNew = false;
    // mock mongoose populate call
    mockUser.populate = function () {
      return Promise.resolve(mockUser);
    };

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(UserModel.collection)
      .expects('updateOne')
      .resolves({});

    sinon.mock(UserModel.collection)
      .expects('findOne')
      .resolves(null);

    const tokenStub = sinon.mock(TokenModel)
      .expects('deleteMany')
      .withArgs(sinon.match({ userId: id }))
      .resolves();

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        active: 'false'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function () {
        expect(tokenStub.called).to.be.true;
      })
      .end(done);
  });

  it('should remove token if user is disabled', function (done) {
    mockTokenWithPermission('UPDATE_USER');

    const id = new mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      enabled: true,
      roleId: new mongoose.Types.ObjectId(),
      authenticationId: new mongoose.Types.ObjectId()
    });

    // mock variable used by mongoose to determine if this is a create or update
    mockUser.isNew = false;
    // mock mongoose populate call
    mockUser.populate = function () {
      return Promise.resolve(mockUser);
    };

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(UserModel.collection)
      .expects('updateOne')
      .resolves({});

    sinon.mock(UserModel.collection)
      .expects('findOne')
      .resolves(null);

    const tokenStub = sinon.mock(TokenModel)
      .expects('deleteMany')
      .withArgs(sinon.match({ userId: id }))
      .resolves();

    request(app)
      .put('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        enabled: 'false'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function () {
        expect(tokenStub.called).to.be.true;
      })
      .end(done);
  });

  it('should fail to update user if passwords dont match', function (done) {
    mockTokenWithPermission('UPDATE_USER_ROLE');

    const id = new mongoose.Types.ObjectId();
    const mockUser = {
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authentication: Authentication.Local({
        _id: new mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        security: {}
      })
    }

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    request(app)
      .put('/api/users/' + id.toString() + '/password')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'confirm',
        roleId: new mongoose.Types.ObjectId()
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal('Passwords do not match');
      })
      .end(done);
  });

  it('should fail to update user if password does not meet complexity', function (done) {
    mockTokenWithPermission('UPDATE_USER_ROLE');

    const id = new mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new Authentication.Local({
        _id: new mongoose.Types.ObjectId(),
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new AuthenticationConfiguration.Model({
          _id: new mongoose.Types.ObjectId(),
          type: 'local',
          name: 'local',
          settings: {
            passwordPolicy: {
              helpText: 'Password must be at least 14 characters',
              passwordMinLengthEnabled: true,
              passwordMinLength: 14
            }
          }
        }),
        security: {}
      })
    });

    sinon.mock(AuthenticationConfiguration.Model)
      .expects('findOne')
      .chain('exec')
      .resolves(mockUser.authentication.authenticationConfiguration);

    sinon.mock(UserModel)
      .expects('findById').withArgs(id.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    request(app)
      .put('/api/users/' + id.toString() + '/password')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        username: 'test',
        displayName: 'test',
        password: 'password',
        passwordconfirm: 'password',
        roleId: new mongoose.Types.ObjectId()
      })
      .expect(400)
      .expect(function (res) {
        res.text.should.equal('Password must be at least 14 characters');
      })
      .end(done);
  });

  it('should update status for myself', function (done) {
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true
    });

    const token = {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function () {
          return Promise.resolve(mockUser);
        }
      }
    };

    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .resolves(token);

    sinon.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

    sinon.mock(mockUser)
      .expects('populate')
      .resolves(mockUser);

    request(app)
      .put('/api/users/myself/status')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        status: 'help'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        mockUser.should.have.property('status').that.equals('help');

        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(userId.toString());
      })
      .end(done);
  });

  it('should fail to update status for myself w/o status', function (done) {
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true
    });

    const token = {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function () {
          return Promise.resolve(mockUser);
        }
      }
    };

    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .resolves(token);

    request(app)
      .put('/api/users/myself/status')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({})
      .expect(400)
      .expect(function (res) {
        res.text.should.equal("Missing required parameter 'status'");
      })
      .end(done);
  });

  it('should delete status for myself', function (done) {
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      status: 'help'
    });

    const token = {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function () {
          return Promise.resolve(mockUser);
        }
      }
    };

    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .resolves(token);

    sinon.mock(mockUser)
      .expects('save')
      .resolves(mockUser);

    sinon.mock(mockUser)
      .expects('populate')
      .resolves(mockUser);

    request(app)
      .delete('/api/users/myself/status')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .send({
        status: 'help'
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        mockUser.should.have.property('status').that.is.undefined;

        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(userId.toString());
      })
      .end(done);
  });

  it('should add recent event for admin user', function (done) {
    mockTokenWithPermission('UPDATE_EVENT');

    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new mongoose.Types.ObjectId()
    });

    sinon.mock(UserModel)
      .expects('findById').withArgs(userId.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    const mockEvent = {
      _id: 1,
      name: 'Mock Event'
    };

    sinon.mock(EventOperations)
      .expects('getById')
      .yields(null, mockEvent);

    sinon.mock(UserModel)
      .expects('findByIdAndUpdate')
      .withArgs(userId, { recentEventIds: [1] }, { new: true })
      .resolves(mockUser);

    request(app)
      .post('/api/users/' + userId.toString() + '/events/1/recent')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(userId.toString());
      })
      .end(done);
  });

  it('should limit recent events for acl user', function (done) {
    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      recentEventIds: [5, 4, 3, 2, 1],
      authenticationId: new mongoose.Types.ObjectId()
    });

    const token = {
      _id: '1',
      token: '12345',
      deviceId: '123',
      userId: {
        populate: function () {
          return Promise.resolve(mockUser);
        }
      }
    };

    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .resolves(token);

    sinon.mock(UserModel)
      .expects('findById').withArgs(userId.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    const eventAcl = {};
    eventAcl[userId.toString()] = 'OWNER';
    const mockEvent = new EventModel({
      _id: 6,
      name: 'Mock Event',
      acl: eventAcl
    });

    sinon.mock(EventOperations)
      .expects('getById')
      .yields(null, mockEvent);

    sinon.mock(UserModel)
      .expects('findByIdAndUpdate')
      .withArgs(userId, { recentEventIds: [6, 5, 4, 3, 2] }, { new: true })
      .resolves(mockUser);

    request(app)
      .post('/api/users/' + userId.toString() + '/events/6/recent')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(userId.toString());
      })
      .end(done);
  });

  it('should add recent event for acl user', function (done) {
    mockTokenWithPermission('NO_ADMIN_PERMISSION');

    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new mongoose.Types.ObjectId()
    });

    sinon.mock(UserModel)
      .expects('findById').withArgs(userId.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    const eventAcl = {};
    eventAcl[userId.toString()] = 'OWNER';
    const mockEvent = new EventModel({
      _id: 1,
      name: 'Mock Event',
      acl: eventAcl
    });

    sinon.mock(EventOperations)
      .expects('getById')
      .yields(null, mockEvent);

    sinon.mock(UserModel)
      .expects('findByIdAndUpdate')
      .withArgs(userId, { recentEventIds: [1] }, { new: true })
      .resolves(mockUser);

    request(app)
      .post('/api/users/' + userId.toString() + '/events/1/recent')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(userId.toString());
      })
      .end(done);
  });

  it('should add recent event for user in event', function (done) {
    mockTokenWithPermission('NO_ADMIN_PERMISSION');

    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new mongoose.Types.ObjectId()
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    const mockEvent1 = {
      _id: 1,
      name: 'Mock Event 12345',
      acl: {}
    };

    sinon.mock(EventOperations)
      .expects('getById')
      .yields(null, mockEvent1);

    sinon.mock(eventPermissions)
      .expects('userHasEventPermission')
      .withArgs(mockEvent1, mockUser.id, EventAccessType.Read)
      .resolves(true)


    sinon.mock(UserModel)
      .expects('findByIdAndUpdate')
      .withArgs(userId, { recentEventIds: [1] }, { new: true })
      .resolves(mockUser);

    request(app)
      .post('/api/users/' + userId.toString() + '/events/1/recent')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        const user = res.body;
        should.exist(user);
        user.should.have.property('id').that.equals(userId.toString());
      })
      .end(done);
  });

  it('should fail to add recent event for user not in event', function (done) {
    mockTokenWithPermission('NO_ADMIN_PERMISSION');

    const mockUser = new UserModel({
      _id: userId,
      username: 'test',
      displayName: 'test',
      active: true,
      authenticationId: new mongoose.Types.ObjectId()
    });

    sinon.mock(UserModel)
      .expects('findById').withArgs(userId.toHexString())
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    const mockEvent = new EventModel({
      _id: 1,
      name: 'Mock Event',
      acl: {}
    });

    sinon.mock(EventOperations)
      .expects('getById')
      .yields(null, mockEvent);

    sinon.mock(UserModel)
      .expects('findByIdAndUpdate')
      .withArgs(userId, { recentEventIds: [1] }, { new: true })
      .resolves(mockUser);

    request(app)
      .post('/api/users/' + userId.toString() + '/events/1/recent')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(403)
      .end(done);
  });

});
