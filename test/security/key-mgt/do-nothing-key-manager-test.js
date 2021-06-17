"use strict";

const sinon = require('sinon')
    , expect = require("chai").expect
    , DoNothingKeyManager = require("../../../security/key-mgt/do-nothing-key-manager");

describe("Do Nothing Key Manager Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test generateDataKey', function (done) {
        const mgr = new DoNothingKeyManager();

        const dataKey = mgr.generateDataKey();
        expect(dataKey).to.be.not.null;
        done();
    });

    it('Test encrypt', function (done) {
        const mgr = new DoNothingKeyManager();

        const data = mgr.encrypt();
        expect(data).to.be.not.null;
        done();
    });

    it('Test decrypt', function (done) {
        const mgr = new DoNothingKeyManager();

        const data = mgr.decrypt();
        expect(data).to.be.not.null;
        done();
    });
});