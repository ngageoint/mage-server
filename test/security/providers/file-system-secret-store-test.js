"use strict";

const chai = require('chai')
    , sinon = require('sinon')
    , sinonChai = require('sinon-chai')
    , expect = require("chai").expect
    , fs = require('fs')
    , FileSystemSecretStore = require("../../../security/providers/file-system-secret-store")
    , ReadCommand = require("../../../security/commands/read-command")
    , DeleteCommand = require("../../../security/commands/delete-command");

describe("File System Secret Store Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test read data that does not exist', function (done) {
        const dataId = '12345';
        const fsStore = new FileSystemSecretStore();
        const command = new ReadCommand(dataId);

        sinon.stub(fs, 'existsSync').returns(false);

        fsStore.send(command).then(response => {
            expect(response.status).to.be.false;
            expect(response.data).to.be.null;
            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test read data', function (done) {
        const dataId = '12345';
        const fsStore = new FileSystemSecretStore();
        const command = new ReadCommand(dataId);

        const data = {
            clientId: '0000'
        };

        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'accessSync').returns(undefined);
        sinon.stub(fs, 'readFileSync').returns(JSON.stringify(data));

        fsStore.send(command).then(response => {
            expect(response.data).to.not.be.null;
            expect(response.data.clientId).to.not.be.null;
            expect(response.data.clientId).to.equal(data.clientId);
            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test read data, wrong permissions', function (done) {
        const dataId = '12345';
        const fsStore = new FileSystemSecretStore();
        const command = new ReadCommand(dataId);

        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'accessSync').throws(new Error('Incorrect permissions'));

        fsStore.send(command).then(() => {
            done('An error should be thrown');
        }).catch(err => {
            done();
        });
    });

    it('Test delete data that does not exist', function (done) {
        const dataId = '12345';
        const fsStore = new FileSystemSecretStore();
        const command = new DeleteCommand(dataId);

        fsStore.send(command).then(response => {
            expect(response.status).to.be.false;
            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test delete data, wrong permissions', function (done) {
        const dataId = '12345';
        const fsStore = new FileSystemSecretStore();
        const command = new DeleteCommand(dataId);

        sinon.stub(fs, 'existsSync').returns(true);
        sinon.stub(fs, 'accessSync').throws(new Error('Incorrect permissions'));

        fsStore.send(command).then(() => {
            done('An error should be thrown');
        }).catch(err => {
            done();
        });
    });
});