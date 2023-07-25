"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , expect = require('chai').expect
  , moment = require('moment')
  , MockToken = require('../mockToken')
  , mongoose = require('mongoose');

require('../../lib/models/token');
const TokenModel = mongoose.model('Token');

require('../../lib/models/login');
const LoginModel = mongoose.model('Login');

require('../../lib/models/device');
const DeviceModel = mongoose.model('Device');

require('../../lib/models/user');
const UserModel = mongoose.model('User');

const Authentication = require('../../lib/models/authentication');

require('sinon-mongoose');

const SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender');
const AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

describe("user authentication tests", function () {

  let app;

  beforeEach(function () {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({ token: "12345" })
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(mongoose.Types.ObjectId(), ['READ_USER']));

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

});
