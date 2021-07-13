"use strict";

const AuthenticationApiAppender = require('../../utilities/authenticationApiAppender.js')
    , AuthenticationConfiguration = require('../../models/authenticationconfiguration')
    , chai = require('chai')
    , sinon = require('sinon')
    , sinonChai = require('sinon-chai')
    , expect = require("chai").expect
    , mongoose = require('mongoose');

describe("Authentication API Appender Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test append is a copy', function (done) {
        const api = {
            name: 'testApi',
            description: 'Test description',
            authenticationStrategies: {
                fakeAuth: {
                    username: 'test',
                    password: 'test'
                }
            }
        };

        const models = [];

        sinon.mock(AuthenticationConfiguration.Model)
            .expects('find')
            .resolves(models);

        AuthenticationApiAppender.append(api).then(appendedApi => {
            expect(appendedApi).to.not.equal(api);

            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test append', function (done) {
        const api = {
            name: 'testApi',
            description: 'Test description',
            authenticationStrategies: {
                fakeAuth: {
                    username: 'test',
                    password: 'test'
                }
            }
        };

        const models = [];

        const model0 = new AuthenticationConfiguration.Model({
            _id: mongoose.Types.ObjectId(),
            type: 'local',
            name: 'local',
            settings: {}
        });
        models.push(model0);

        sinon.mock(AuthenticationConfiguration.Model)
            .expects('find')
            .resolves(models);

        AuthenticationApiAppender.append(api).then(appendedApi => {
            expect(appendedApi.name).to.equal(api.name);
            expect(appendedApi.description).to.equal(api.description);
            expect(appendedApi.authenticationStrategies.fakeAuth).to.be.undefined;

            models.forEach(model => {
                expect(appendedApi.authenticationStrategies[model.name]).to.exist;
            });

            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test append with no strategies', function (done) {
        const api = {
            name: 'testApi',
            description: 'Test description',
            authenticationStrategies: {
            }
        };

        const models = [];

        sinon.mock(AuthenticationConfiguration.Model)
            .expects('find')
            .resolves(models);

        AuthenticationApiAppender.append(api).then(appendedApi => {
            expect(appendedApi.name).to.equal(api.name);
            expect(appendedApi.description).to.equal(api.description);
            expect(Object.keys(appendedApi.authenticationStrategies).length).to.equal(0);

            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test append disabled auth', function (done) {
        const api = {
            name: 'testApi',
            description: 'Test description',
            authenticationStrategies: {
                fakeAuth: {
                    username: 'test',
                    password: 'test'
                }
            }
        };

        const models = [];

        const model0 = new AuthenticationConfiguration.Model({
            _id: mongoose.Types.ObjectId(),
            type: 'local',
            name: 'local',
            enabled: false,
            settings: {}
        });
        models.push(model0);

        sinon.mock(AuthenticationConfiguration.Model)
            .expects('find')
            .resolves(models);

        AuthenticationApiAppender.append(api).then(appendedApi => {
            expect(appendedApi.name).to.equal(api.name);
            expect(appendedApi.description).to.equal(api.description);
            expect(appendedApi.authenticationStrategies.fakeAuth).to.be.undefined;

            models.forEach(model => {
                expect(appendedApi.authenticationStrategies[model.name]).to.not.exist;
            });

            done();
        }).catch(err => {
            done(err);
        });
    });

});