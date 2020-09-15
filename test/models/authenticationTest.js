const request = require('supertest')
  , sinon = require('sinon')
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , Authentication = require('../../models/authentication');

const AuthenticationModel = mongoose.model('Authentication');

require('sinon-mongoose');

describe("authentication model tests", function () {

  afterEach(function () {
    sinon.restore();
  });

  it('validate complete model', function (done) {
    const authentication = new AuthenticationModel({
      password: 'password'
    });

    authentication.validate(function (err) {
      expect(err).to.be.null;
      done();
    });
  });

  it('validate missing password', function (done) {
    const authentication = new AuthenticationModel();

    authentication.validate(function (err) {
      expect(err.errors.password).to.exist;
      done();
    });
  });
});