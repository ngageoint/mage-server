"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , chai = require('chai')
  , mongoose = require('mongoose')
  , Authentication = require('../../lib/models/authentication')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender');

const expect = chai.expect;

const UserOperations = require('../../lib/models/user');
const UserModel = mongoose.model('User');

describe("device provision tests", function () {

  let app;

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

    app = require('../../lib/express').app;
  });

  afterEach(function () {
    sinon.restore();
  });

  it("test authenticate", async function () {
    const userId = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
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

    sinon.mock(AuthenticationConfiguration)
      .expects('getConfiguration')
      .resolves(mockUser.authentication.authenticationConfiguration);

    sinon.mock(UserOperations)
      .expects('getUserByUsername')
      .yields(null, mockUser);

    sinon.mock(Authentication.Local.prototype)
      .expects('validatePassword')
      .yields(null, true);

    sinon.mock(mockUser.authentication)
      .expects('save')
      .resolves(mockUser.authentication);

    await request(app)
      .post('/auth/local/signin')
      .send({
        username: 'test',
        password: 'test'
      })
      .expect(200)
      .expect(function (res) {
        expect(res.body.token).to.not.be.null;
      });
  });
});
