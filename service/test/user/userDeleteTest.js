"use strict";

const request = require('supertest')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , createToken = require('../mockToken')
  , TokenModel = require('../../lib/models/token')
  , SecurePropertyAppender = require('../../lib/security/utilities/secure-property-appender')
  , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('../../lib/models/user');
const UserModel = mongoose.model('User');

require('sinon-mongoose');

describe("user delete tests", function () {

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

  it('should delete user by id', function (done) {
    mockTokenWithPermission('DELETE_USER');

    const id = mongoose.Types.ObjectId();
    const mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('populate', 'roleId')
      .chain('populate', 'authenticationId')
      .resolves(mockUser);

    sinon.mock(mockUser)
      .expects('remove')
      .yields(null, mockUser);

    request(app)
      .delete('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(204)
      .end(done);
  });

});
