"use strict";

const env = require('../../environment/env')
    , fs = require('fs')
    , log = require('winston')
    , path = require('path')
    , ReadCommand = require('./read-command')
    , WriteCommand = require('./write-command');

class FileSystemSecretStore {
    _config;
    static suffix = '.dat';

    constructor(config = { storageLocation: env.securityStoreDirectory }) {
        this._config = config;

        log.info('Secure storage location: ' + this._config.storageLocation);
    }

    send(command) {
        let response;

        if (command instanceof ReadCommand) {
            response = this.read(command);
        } else if (command instanceof WriteCommand) {
            response = this.write(command);
        } else {
            response = Promise.reject('Unknown command received');
        }

        return response;
    }

    read(command) {
        const file = path.join(this._config.storageLocation, command.id + FileSystemSecretStore.suffix);
        return Promise.resolve(fs.readFileSync(file));
    }

    write(command) {

    }
}

module.exports = FileSystemSecretStore;