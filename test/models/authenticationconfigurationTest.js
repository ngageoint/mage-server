"use strict";

const sinon = require('sinon')
    , expect = require('chai').expect
    , mongoose = require('mongoose')
    , AuthenticationConfiguration = require('../../models/authenticationconfiguration');

require('sinon-mongoose');

describe("authentication configuration model tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('validate model', function (done) {
        const authConfig = new AuthenticationConfiguration.Model({
            name: 'local',
            type: 'local'
        });

        authConfig.validate(function (err) {
            expect(err).to.be.null;

            authConfig.name = null;
            authConfig.validate(function (err) {
                expect(err).to.not.be.null;
                done();
            });
        });
    });
});