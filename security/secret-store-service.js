"use strict";

const log = require('winston')
    , FileSystemSecretStore = require("./providers/file-system-secret-store")
    , ReadCommand = require('./commands/read-command')
    , WriteCommand = require('./commands/write-command')
    , DeleteCommand = require('./commands/delete-command');

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
     * @returns {Promise}
     */
    read(dataId) {
        const command = new ReadCommand(dataId);

        return this._backingDataStore.send(command);
    }

    /**
     * 
     * @param {string} dataId the id associated with the data
     * @param {*} data 
     * @returns {Promise}
     */
    write(dataId, data) {
        const command = new WriteCommand(dataId, data);

        return this._backingDataStore.send(command);
    }

    /**
     * 
     * @param {string} dataId the id associated with the data
     * @returns {Promise}
     */
    delete(dataId) {
        const command = new DeleteCommand(dataId);

        return this._backingDataStore.send(command);
    }
}

module.exports = SecretStoreService;