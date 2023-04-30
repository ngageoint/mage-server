"use strict";

const sinon = require('sinon')
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , Authentication = require('../../lib/models/authentication');

require('sinon-mongoose');

describe("authentication model", function () {

  afterEach(function () {
    sinon.restore();
  });

  describe('local auth model', function() {

    it('validates local auth model', function (done) {

      const authentication = new Authentication.Local({
        type: 'local',
        password: 'password',
        authenticationConfigurationId: mongoose.Types.ObjectId()
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

    describe('toObject', function() {

      it('redacts passwords', function() {

        const authentication = new Authentication.Local({
          type: 'local',
          password: 'password now',
          previousPasswords: [ 'password before' ],
          authenticationConfigurationId: mongoose.Types.ObjectId()
        });
        const authObj = authentication.toObject();

        expect(authObj).to.not.have.property('password')
        expect(authObj).to.not.have.property('previousPasswords')
      })
    })
  })
});