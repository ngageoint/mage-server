"use strict";

const FileSystemSecretStore = require("./local/file-system-secret-store")
    , log = require('winston')
    , ReadCommand = require('./local/read-command')
    , WriteCommand = require('./local/write-command')
    , DeleteCommand = require('./local/delete-command');

class SecretStoreService {
    _config;

    constructor(config = { storageType: 'FILE' }) {
        this._config = config;

        switch (this._config.storageType) {
            case 'FILE':
            default:
                this._backingDataStore = new FileSystemSecretStore();
                break;
        }

        log.debug('Secure storage type: ' + this._config.storageType);
    }

    /**
     * 
     * @param {string} dataId the id associated with the data
     * @param {*} options 
     * @returns {Promise}
     */
    read(dataId, options = {}) {
        const command = new ReadCommand(dataId);

        return this._backingDataStore.send(command);
    }

    /**
     * 
     * @param {string} dataId the id associated with the data
     * @param {*} data 
     * @param {*} options 
     * @returns {Promise}
     */
    write(dataId, data, options = {}) {
        const command = new WriteCommand(dataId, data);

        return this._backingDataStore.send(command);
    }

    /**
     * 
     * @param {string} dataId the id associated with the data
     * @param {*} options 
     * @returns {Promise}
     */
    delete(dataId, options = {}) {
        const command = new DeleteCommand(dataId);

        return this._backingDataStore.send(command);
    }
}

module.exports = SecretStoreService;