"use strict";

const sinon = require('sinon')
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , Authentication = require('../../lib/models/authentication');

describe("authentication model", function () {

  afterEach(function () {
    sinon.restore();
  });

  describe('local auth model', function () {

    it('validates local auth model', async function () {

      const authentication = new Authentication.Local({
        type: 'local',
        password: 'password',
        authenticationConfigurationId: new mongoose.Types.ObjectId()
      });

      await authentication.validate();
      authentication.password = null;

      try {
        await authentication.validate();
        expect.fail('Expected validation to fail when password is null');
      } catch (err) {
        expect(err).to.not.be.null;
      }
    });

    describe('toObject', function () {

      it('redacts passwords', function () {

        const authentication = new Authentication.Local({
          type: 'local',
          password: 'password now',
          previousPasswords: ['password before'],
          authenticationConfigurationId: new mongoose.Types.ObjectId()
        });
        const authObj = authentication.toObject();

        expect(authObj).to.not.have.property('password')
        expect(authObj).to.not.have.property('previousPasswords')
      })
    })
  })
});