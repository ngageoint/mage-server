"use strict";

const sinon = require('sinon')
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , Authentication = require('../../models/authentication');

require('sinon-mongoose');

describe("authentication model tests", function () {

  afterEach(function () {
    sinon.restore();
  });

  it('validate local auth model', function (done) {
    const authentication = new Authentication.Local({
      type: 'local',
      password: 'password'
    });

    authentication.validate(function (err) {
      expect(err).to.be.null;

      authentication.password = null;
      authentication.validate(function (err) {
        expect(err).to.not.be.null;
        done();
      });
    });
  });

  it('verify local auth create', function (done) {
    const mockAuth = new Authentication.Local({
      _id: mongoose.Types.ObjectId(),
      type: 'local',
      password: 'password'
    });

    sinon.stub(Authentication.Local.prototype, 'save')
      .resolves(mockAuth);

    Authentication.createAuthentication(mockAuth).then(auth => {
      expect(auth).to.not.be.null;
      sinon.assert.calledOnce(Authentication.Local.prototype.save);
      done();
    }).catch(err => {
      done(err);
    });
  });

  it('verify saml auth create', function (done) {
    const mockAuth = new Authentication.SAML({
      _id: mongoose.Types.ObjectId(),
      type: 'saml'
    });

    sinon.stub(Authentication.SAML.prototype, 'save')
      .resolves(mockAuth);

    Authentication.createAuthentication(mockAuth).then(auth => {
      expect(auth).to.not.be.null;
      sinon.assert.calledOnce(Authentication.SAML.prototype.save);
      done();
    }).catch(err => {
      done(err);
    });
  });

  it('verify ldap auth create', function (done) {
    const mockAuth = new Authentication.LDAP({
      _id: mongoose.Types.ObjectId(),
      type: 'ldap'
    });

    sinon.stub(Authentication.LDAP.prototype, 'save')
      .resolves(mockAuth);

    Authentication.createAuthentication(mockAuth).then(auth => {
      expect(auth).to.not.be.null;
      sinon.assert.calledOnce(Authentication.LDAP.prototype.save);
      done();
    }).catch(err => {
      done(err);
    });
  });
});