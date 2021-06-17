"use strict";

const env = require('../../environment/env')
    , fs = require('fs')
    , log = require('winston')
    , path = require('path')
    , DataResponse = require('../responses/data-response');

class FileSystemSecretStore {
    _config;

    constructor(config = { storageLocation: env.securityDirectory, suffix: '.json' }) {
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

    read(id) {
        const response = new DataResponse(id);
        let promise;
        try {
            const file = path.join(this._config.storageLocation, id + this._config.suffix);
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

    write(id, data) {
        const response = new DataResponse(id);
        let promise;
        try {
            const file = path.join(this._config.storageLocation, id + this._config.suffix);
            fs.accessSync(this._config.storageLocation, fs.constants.W_OK);

            const writeOptions = {
                mode: fs.constants.S_IRUSR | fs.constants.S_IWUSR
            };
            response.data = fs.writeFileSync(file, data, writeOptions);
            promise = Promise.resolve(response);
        } catch (err) {
            log.warn(err);
            response.error = err;
            promise = Promise.reject(response);
        }
        return promise;
    }

    delete(id) {
        const response = new DataResponse(id);
        let promise;
        try {
            const file = path.join(this._config.storageLocation, id + this._config.suffix);
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