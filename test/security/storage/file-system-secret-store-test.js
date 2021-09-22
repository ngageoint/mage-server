"use strict";

const sinon = require('sinon')
    , expect = require("chai").expect
    , fs = require('fs')
    , FileSystemSecretStore = require("../../../security/storage/file-system-secret-store");

describe("File System Secret Store Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test read data that does not exist', function (done) {
        const dataId = '12345';
        const fsStore = new FileSystemSecretStore();

        sinon.stub(fs, 'existsSync').returns(false);

        const response = fsStore.read(dataId);
        expect(response).to.be.undefined;
        done();
    });

    it('Test read data', function (done) {
        const dataId = '12345';
        const fsStore = new FileSystemSecretStore();

        const data = {
            clientId: '0000'
        };

        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'accessSync').returns(undefined);
        sinon.stub(fs, 'readFileSync').returns(JSON.stringify(data));

        const response = fsStore.read(dataId)
        expect(response).to.not.be.null;
        expect(response.clientId).to.not.be.null;
        expect(response.clientId).to.equal(data.clientId);
        done();
    });

    it('Test read data, wrong permissions', function (done) {
        const dataId = '12345';
        const fsStore = new FileSystemSecretStore();

        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'accessSync').throws(new Error('Incorrect permissions'));

        try {
            fsStore.read(dataId);
            done('An error should be thrown');
        } catch (err) {
            done();
        }
    });

    it('Test delete data that does not exist', function (done) {
        const dataId = '12345';
        const fsStore = new FileSystemSecretStore();

        fsStore.delete(dataId);
        done();
    });

    it('Test delete data, wrong permissions', function (done) {
        const dataId = '12345';
        const fsStore = new FileSystemSecretStore();

        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'accessSync').throws(new Error('Incorrect permissions'));

        try {
            fsStore.delete(dataId);
            done('Should fail');
        } catch (err) {
            done();
        }

    });
});