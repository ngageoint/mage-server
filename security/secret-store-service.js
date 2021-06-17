"use strict";

const log = require('winston')
    , FileSystemSecretStore = require("./storage/file-system-secret-store")
    , KeyMgtFactory = require('./key-mgt/key-mgt-factory');
const DataResponse = require('./responses/data-response');

class SecretStoreService {
    _config;
    _keyManager;

    constructor(config = { storageType: 'FILE' }) {
        this._config = config;

        switch (this._config.storageType) {
            case 'FILE':
            default:
                this._backingDataStore = new FileSystemSecretStore();
                break;
        }

        this._keyManager = KeyMgtFactory.getKeyManager();

        log.debug('Secure storage type: ' + this._config.storageType);
    }

    /**
     * 
     * @param {string} dataId the id associated with the data
     * @returns {Promise} {@link DataResponse}
     */
    read(dataId) {
        const data = this._backingDataStore.read(dataId);

        if (data) {
            const meta = data._metadata;
            delete data._metadata;

            if (meta) {
                Object.keys(data).forEach(key => {
                    const decryptRequest = { CiphertextBlob: data[key], EncryptionAlgorithm: meta.EncryptionAlgorithm, KeyId: meta.KeyId };
                    const decryptResponse = this._keyManager.decrypt(decryptRequest);
                    data[key] = decryptResponse.Plaintext;
                });
            }
        } else {
            log.debug('No secure store located for ' + dataId);
        }

        const response = new DataResponse(dataId);
        response.data = data;

        return Promise.resolve(response);
    }

    /**
     * 
     * @param {string} dataId the id associated with the data
     * @param {*} data plaintext JSON data
     * @returns {Promise} {@link DataResponse}
     */
    write(dataId, data) {

        const encryptedData = {
            _metadata: {
                EncryptionAlgorithm: '',
                KeyId: ''
            }
        }

        Object.keys(data).forEach(key => {
            const encryptRequest = {
                KeyId: encryptedData._metadata.KeyId,
                EncryptionAlgorithm: encryptedData._metadata.EncryptionAlgorithm,
                Plaintext: data[key]
            };

            const encryptResponse = this._keyManager.encrypt(encryptRequest);

            encryptedData[key] = encryptResponse.CiphertextBlob;
        });

        this._backingDataStore.write(dataId, encryptedData);
        const response = new DataResponse(dataId);
        response.data = encryptedData;

        return Promise.resolve(response);
    }

    /**
     * 
     * @param {string} dataId the id associated with the data
     * @returns {Promise} {@link DataResponse}
     */
    delete(dataId) {
        this._backingDataStore.delete(dataId);
        return Promise.resolve(new DataResponse(dataId));
    }
}

module.exports = SecretStoreService;