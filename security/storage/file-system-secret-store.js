"use strict";

const env = require('../../environment/env')
    , fs = require('fs')
    , log = require('winston')
    , path = require('path')
    , JSONProvider = require('./json-provider');

class FileSystemSecretStore {
    _config;
    _dataProvider;

    constructor(config = { storageLocation: env.securityDirectory, suffix: '.json' }, provider = new JSONProvider) {
        this._config = config;
        this._dataProvider = provider;

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
        let response;

        const file = path.join(this._config.storageLocation, id + this._config.suffix);
        if (fs.existsSync(file)) {
            fs.accessSync(file, fs.constants.R_OK);
            response = this._dataProvider.read(fs.readFileSync(file));
        }

        return response;
    }

    write(id, data) {
        const file = path.join(this._config.storageLocation, id + this._config.suffix);
        fs.accessSync(this._config.storageLocation, fs.constants.W_OK);

        const writeOptions = {
            mode: fs.constants.S_IRUSR | fs.constants.S_IWUSR
        };
        fs.writeFileSync(file, this._dataProvider.write(data), writeOptions);
    }

    delete(id) {
        const file = path.join(this._config.storageLocation, id + this._config.suffix);
        if (fs.existsSync(file)) {
            fs.accessSync(file, fs.constants.W_OK);
            fs.unlinkSync(file);
        }
    }
}

module.exports = FileSystemSecretStore;