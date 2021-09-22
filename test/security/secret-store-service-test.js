"use strict";

const sinon = require('sinon')
    , expect = require("chai").expect
    , SecretStoreService = require("../../security/secret-store-service");

describe("Secret Store Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test read', function (done) {
        const dataId = '12345';

        const secretStore = new SecretStoreService();
        const testData = 'some test data';

        sinon.mock(secretStore).expects('read').withArgs('12345').resolves(testData);

        secretStore.read(dataId).then(response => {
            expect(response).to.not.be.undefined;
            expect(response).to.equal(testData);
        }).finally(() => {
            done();
        });
    });
});