"use strict";

const sinon = require('sinon')
    , expect = require("chai").expect
    , fs = require('fs')
    , SecurePropertyAppender = require("../../../security/utilities/secure-property-appender");

describe("Secret Store Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test append with no secure store', function (done) {
        const config = {
            _id: '12345'
        };

        sinon.stub(fs, 'existsSync').returns(false);

        SecurePropertyAppender.appendToConfig(config).then(appendedConfig => {
            expect(Object.keys(appendedConfig).length).to.equal(1);
            done();
        });
    });
});