"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose');

require('sinon-mongoose');

require('../../models/token');
const TokenModel = mongoose.model('Token');

require('../../models/login');
const LoginModel = mongoose.model('Login');

require('../../models/device');
const DeviceModel = mongoose.model('Device');

require('../../models/user');
const UserModel = mongoose.model('User');

const Authentication = require('../../models/authentication');
const SecurePropertyAppender = require('../../security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../models/authenticationconfiguration');

let userId;
let mockUser;
let app;

async function authenticate() {
  userId = mongoose.Types.ObjectId();
  mockUser = new UserModel({
    _id: userId,
    username: 'test',
    displayName: 'test',
    active: true,
    enabled: true,
    roleId: mongoose.Types.ObjectId(),
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
    .yields(null, mockUser);

  sinon.mock(Authentication.Local.prototype)
    .expects('validatePassword')
    .yields(null, true);

  sinon.mock(mockUser.authentication)
    .expects('save')
    .resolves(mockUser.authentication);

  let jwt;
  await request(app)
    .post('/auth/local/signin')
    .send({
      username: 'test',
      password: 'test'
    })
    .expect(200)
    .expect(function (res) {
      jwt = res.body.token;
      sinon.restore();
    });

  return jwt;
}

describe("device provision tests", function () {

  let jwt;

  beforeEach(async () => {
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
    jwt = await authenticate();
  });

  afterEach(function () {
    sinon.restore();
  });
});
