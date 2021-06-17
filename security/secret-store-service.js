"use strict";

const log = require('winston')
    , FileSystemSecretStore = require("./storage/file-system-secret-store");

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
     * @returns {Promise} {@link DataResponse}
     */
    read(dataId) {
        return this._backingDataStore.read(dataId);
    }

    /**
     * 
     * @param {string} dataId the id associated with the data
     * @param {*} data plaintext JSON data
     * @returns {Promise} {@link DataResponse}
     */
    write(dataId, data) {
        return this._backingDataStore.write(dataId, data);
    }

    /**
     * 
     * @param {string} dataId the id associated with the data
     * @returns {Promise} {@link DataResponse}
     */
    delete(dataId) {
        return this._backingDataStore.delete(dataId);
    }
}

module.exports = SecretStoreService;