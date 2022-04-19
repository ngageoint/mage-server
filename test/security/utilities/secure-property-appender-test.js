"use strict";

const sinon = require('sinon')
    , expect = require("chai").expect
    , fs = require('fs')
    , SecurePropertyAppender = require("../../../security/utilities/secure-property-appender")
    , AuthenticationConfiguration = require('../../../models/authenticationconfiguration');

describe("Secure Property Appender Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test append with no secure store', function (done) {
        sinon.stub(AuthenticationConfiguration, 'blacklist')
            .value([]);

        const config = {
            _id: '12345'
        };

        sinon.stub(fs, 'existsSync').returns(false);

        SecurePropertyAppender.appendToConfig(config).then(appendedConfig => {
            expect(Object.keys(appendedConfig).length).to.equal(1);
            done();
        });
    });

    it('Test append', function (done) {
        sinon.stub(AuthenticationConfiguration, 'blacklist')
            .value(['testdata', 'addldata']);

        const config = {
            _id: '12345'
        };

        const secureProperties = {
            testData: 'Test data',
            addlData: 'More test data'
        };

        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'accessSync').returns(true);
        sinon.stub(fs, 'readFileSync').returns(secureProperties);

        SecurePropertyAppender.appendToConfig(config).then(appendedConfig => {
            expect(appendedConfig.settings).to.not.be.undefined;
            expect(Object.keys(appendedConfig.settings).length).to.equal(Object.keys(secureProperties).length);

            Object.keys(secureProperties).forEach(key => {
                expect(appendedConfig.settings[key]).equals(secureProperties[key]);
            });

            done();
        });
    });
});