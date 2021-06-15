"use strict";

const env = require('../../environment/env')
    , fs = require('fs')
    , log = require('winston')
    , path = require('path')
    , DataResponse = require('../responses/data-response')
    , ReadCommand = require('../commands/read-command')
    , WriteCommand = require('../commands/write-command')
    , DeleteCommand = require('../commands/delete-command');

class FileSystemSecretStore {
    _config;
    static suffix = '.dat';

    constructor(config = { storageLocation: env.securityDirectory }) {
        this._config = config;

        log.debug('Secure storage location: ' + this._config.storageLocation);

        try {
            if (!fs.existsSync(this._config.storageLocation)) {
                const createOptions = {
                    mode: fs.constants.S_IRUSR | fs.constants.S_IWUSR | fs.constants.S_IXUSR
                };
                fs.mkdirSync(this._config.storageLocation, createOptions);
            }
        } catch (err) {
            log.error(err);
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
        const response = new DataResponse(command.id);
        let promise;
        try {
            const file = path.join(this._config.storageLocation, command.id + FileSystemSecretStore.suffix);
            if (fs.existsSync(file)) {
                fs.accessSync(file, fs.constants.R_OK);
                response.data = JSON.parse(fs.readFileSync(file));
            } else {
                response.status = false;
            }
            promise = Promise.resolve(response);
        } catch (err) {
            log.warn(err);
            response.error = err;
            promise = Promise.reject(err);
        }
        return promise;
    }

    write(command) {
        const response = new DataResponse(command.id);
        let promise;
        try {
            const file = path.join(this._config.storageLocation, command.id + FileSystemSecretStore.suffix);
            fs.accessSync(this._config.storageLocation, fs.constants.W_OK);

            const writeOptions = {
                mode: fs.constants.S_IRUSR | fs.constants.S_IWUSR
            };
            response.data = fs.writeFileSync(file, command.data, writeOptions);
            promise = Promise.resolve(response);
        } catch (err) {
            log.warn(err);
            response.error = err;
            promise = Promise.reject(response);
        }
        return promise;
    }

    delete(command) {
        const response = new DataResponse(command.id);
        let promise;
        try {
            const file = path.join(this._config.storageLocation, command.id + FileSystemSecretStore.suffix);
            if (fs.existsSync(file)) {
                fs.accessSync(file, fs.constants.W_OK);
                fs.rmSync(file);
                response.status = true;
            } else {
                response.status = false;
            }
            promise = Promise.resolve(response);
        } catch (err) {
            log.warn(err);
            response.error = err;
            promise = Promise.reject(response);
        }
        return promise;
    }
}

module.exports = FileSystemSecretStore;