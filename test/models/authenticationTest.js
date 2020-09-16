const sinon = require('sinon')
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

  it('verify create logic', function (done) {
    const mockAuth = new AuthenticationModel({
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password'
    });

    sinon.stub(AuthenticationModel.prototype, 'save')
      .resolves(mockAuth);

    Authentication.createAuthentication(mockAuth).then(auth => {
      expect(auth).to.not.be.null;
      sinon.assert.calledOnce(AuthenticationModel.prototype.save);
      done();
    }).catch(err => {
      done(err);
    });
  });
});