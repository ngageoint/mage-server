"use strict";

const chai = require('chai')
    , sinon = require('sinon')
    , sinonChai = require('sinon-chai')
    , expect = require("chai").expect
    , SecretStoreService = require("../../security/secret-store-service");

describe("Secret Store Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test read', function (done) {
        const secretStore = new SecretStoreService();

        secretStore.read('');

        done();
    });
});