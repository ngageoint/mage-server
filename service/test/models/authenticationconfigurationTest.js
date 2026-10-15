"use strict";

const sinon = require('sinon')
    , expect = require('chai').expect
    , AuthenticationConfiguration = require('../../lib/models/authenticationconfiguration');

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

    it('test whitelist strips settings for local strategy too', function (done) {
        const authConfig = new AuthenticationConfiguration.Model({
            name: 'local',
            type: 'local',
            settings: {
                passwordPolicy: {
                    passwordMinLengthEnabled: true,
                    passwordMinLength: 14,
                    customizeHelpText: false
                }
            }
        });

        const whitelistedConfig = authConfig.toObject({ whitelist: true, transform: AuthenticationConfiguration.transform });

        expect(whitelistedConfig.settings).to.be.undefined;
        done();
    });

    it('test whitelist exposes passwordHelpText for local strategy when customizeHelpText is enabled', function (done) {
        const authConfig = new AuthenticationConfiguration.Model({
            name: 'local',
            type: 'local',
            settings: {
                passwordPolicy: {
                    passwordMinLengthEnabled: true,
                    passwordMinLength: 14,
                    customizeHelpText: true,
                    helpText: 'Your password is invalid and must be at least 14 characters in length.'
                }
            }
        });

        const whitelistedConfig = authConfig.toObject({ whitelist: true, transform: AuthenticationConfiguration.transform });

        expect(whitelistedConfig.settings).to.be.undefined;
        expect(whitelistedConfig.passwordHelpText).to.equal(
            'Your password is invalid and must be at least 14 characters in length.'
        );
        done();
    });

    it('test whitelist does not expose passwordHelpText for local strategy when customizeHelpText is disabled', function (done) {
        const authConfig = new AuthenticationConfiguration.Model({
            name: 'local',
            type: 'local',
            settings: {
                passwordPolicy: {
                    passwordMinLengthEnabled: true,
                    passwordMinLength: 14,
                    customizeHelpText: false,
                    helpText: 'Your password is invalid and must be at least 14 characters in length.'
                }
            }
        });

        const whitelistedConfig = authConfig.toObject({ whitelist: true, transform: AuthenticationConfiguration.transform });

        expect(whitelistedConfig.passwordHelpText).to.be.undefined;
        done();
    });

    it('test whitelist does not expose passwordHelpText for local strategy with no password policy configured', function (done) {
        const authConfig = new AuthenticationConfiguration.Model({
            name: 'local',
            type: 'local'
        });

        const whitelistedConfig = authConfig.toObject({ whitelist: true, transform: AuthenticationConfiguration.transform });

        expect(whitelistedConfig.passwordHelpText).to.be.undefined;
        done();
    });

    it('test blacklist does not throw for local strategy without settings', function (done) {
        const authConfig = new AuthenticationConfiguration.Model({
            name: 'local',
            type: 'local',
            settings: {}
        });

        const blacklistedConfig = authConfig.toObject({ blacklist: true, transform: AuthenticationConfiguration.transform });

        expect(blacklistedConfig.settings).to.be.undefined;
        done();
    });
});