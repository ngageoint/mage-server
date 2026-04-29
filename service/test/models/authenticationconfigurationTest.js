"use strict";

const sinon = require('sinon')
    , expect = require('chai').expect
    , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

require('sinon-mongoose');

describe("authentication configuration model tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('validate model', async function () {
        const authConfig = new AuthenticationConfiguration.Model({
            name: 'local',
            type: 'local'
        });

        await authConfig.validate();
        authConfig.name = null;

        try {
            await authConfig.validate();
            expect.fail('Expected validation to fail when name is null');
        } catch (err) {
            expect(err).to.not.be.null;
        }
    });

    it('test whitelist', function (done) {
        const authConfig = new AuthenticationConfiguration.Model({
            name: 'ldap',
            type: 'ldap',
            settings: {
                fake: 'should not be here'
            }
        });

        const whitelistedConfig = authConfig.toObject({ whitelist: true, transform: AuthenticationConfiguration.transform });

        expect(whitelistedConfig.settings).to.be.undefined;
        done();
    });
});