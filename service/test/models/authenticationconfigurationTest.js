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

    it('test whitelist exposes button display fields', function (done) {
        const authConfig = new AuthenticationConfiguration.Model({
            name: 'openidconnect',
            type: 'openidconnect',
            title: 'Keycloak',
            textColor: '#FFFFFF',
            buttonColor: '#1E88E5',
            buttonText: 'Continue to sign in',
            settings: {
                clientID: 'mage'
            }
        });

        const whitelistedConfig = authConfig.toObject({ whitelist: true, transform: AuthenticationConfiguration.transform });

        expect(whitelistedConfig.title).to.equal('Keycloak');
        expect(whitelistedConfig.textColor).to.equal('#FFFFFF');
        expect(whitelistedConfig.buttonColor).to.equal('#1E88E5');
        expect(whitelistedConfig.buttonText).to.equal('Continue to sign in');
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

    describe('updating the button icon', function () {
        function stubUpdate() {
            return sinon.stub(AuthenticationConfiguration.Model, 'findByIdAndUpdate')
                .callsFake((id, update) => ({ exec: () => Promise.resolve(update) }));
        }

        it('stores an uploaded data URL icon as image bytes', async function () {
            const update = stubUpdate();

            await AuthenticationConfiguration.update('id', { name: 'openidconnect', type: 'openidconnect', icon: 'data:image/png;base64,iVBORw0KGgo=', settings: {} });

            const stored = update.firstCall.args[1].icon;
            expect(Buffer.isBuffer(stored)).to.be.true;
            expect(stored.toString('base64')).to.equal('iVBORw0KGgo=');
        });

        it('keeps an existing icon sent back as base64', async function () {
            const update = stubUpdate();

            await AuthenticationConfiguration.update('id', { name: 'openidconnect', type: 'openidconnect', icon: 'iVBORw0KGgo=', settings: {} });

            expect(update.firstCall.args[1].icon.toString('base64')).to.equal('iVBORw0KGgo=');
        });

        it('clears the icon when it is removed', async function () {
            const update = stubUpdate();

            await AuthenticationConfiguration.update('id', { name: 'openidconnect', type: 'openidconnect', icon: null, settings: {} });

            expect(update.firstCall.args[1].icon).to.be.null;
        });
    });
});