"use strict";

const chai = require('chai')
    , sinon = require('sinon')
    , sinonChai = require('sinon-chai')
    , expect = require("chai").expect
    , FileSystemSecretStore = require("../../../security/local/file-system-secret-store")
    , ReadCommand = require("../../../security/commands/read-command");

describe("File System Secret Store Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test read data that does not exist', function (done) {
        const dataId = '12345';
        const fsStore = new FileSystemSecretStore();
        const command = new ReadCommand(dataId);

        fsStore.send(command).then(response => {
            expect(response.status).to.be.false;
            done();
        }).catch(err => {
            done(err);
        });
    });
});