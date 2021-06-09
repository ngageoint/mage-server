"use strict";

const env = require('../../environment/env')
    , fs = require('fs')
    , log = require('winston')
    , path = require('path')
    , ReadCommand = require('./read-command')
    , WriteCommand = require('./write-command')
    , DeleteCommand = require('./delete-command');

class FileSystemSecretStore {
    _config;
    static suffix = '.dat';

    constructor(config = { storageLocation: env.securityDirectory }) {
        this._config = config;

        log.info('Secure storage location: ' + this._config.storageLocation);

        try {
            fs.mkdirSync(this._config.storageLocation);
        } catch (err) {
            log.debug(err);
        }
    }

    send(command) {
        let response;

        if (command instanceof ReadCommand) {
            response = this.read(command);
        } else if (command instanceof WriteCommand) {
            response = this.write(command);
        } else if (command instanceof DeleteCommand) {
            response = this.delete(command);
        } else {
            response = Promise.reject('Unknown command received');
        }

        return response;
    }

    read(command) {
        let response;
        try {
            const file = path.join(this._config.storageLocation, command.id + FileSystemSecretStore.suffix);
            fs.accessSync(file, fs.constants.R_OK);
            response = Promise.resolve(fs.readFileSync(file));
        } catch (err) {
            log.warn(err);
            response = Promise.reject(err);
        }
        return response;
    }

    write(command) {
        let response;
        try {
            const file = path.join(this._config.storageLocation, command.id + FileSystemSecretStore.suffix);
            fs.accessSync(this._config.storageLocation, fs.constants.W_OK);

            const writeOptions = {
                mode: fs.constants.S_IRUSR | fs.constants.S_IWUSR
            };
            response = Promise.resolve(fs.writeFileSync(file, command.data, writeOptions));
        } catch (err) {
            log.warn(err);
            response = Promise.reject(err);
        }
        return response;
    }

    delete(command) {
        let response;
        try {
            const file = path.join(this._config.storageLocation, command.id + FileSystemSecretStore.suffix);
            fs.accessSync(file, fs.constants.W_OK);
            response = Promise.resolve(fs.rmSync(file));
        } catch (err) {
            log.warn(err);
            response = Promise.reject(err);
        }
        return response;
    }
}

module.exports = FileSystemSecretStore;