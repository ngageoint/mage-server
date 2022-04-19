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
});