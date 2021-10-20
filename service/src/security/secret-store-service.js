"use strict";

const log = require('winston')
    , FileSystemSecretStore = require("./storage/file-system-secret-store")
    , KeyMgtFactory = require('./key-mgt/key-mgt-factory')
    , DataResponse = require('./responses/data-response');

/**
 * This is the class to use for interactions to the secret store.
 * 
 * @since 5.5.3
 */
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
                //Decrypt
                Object.keys(data).forEach(key => {
                    const decryptRequest = {
                        CiphertextBlob: data[key],
                        EncryptionAlgorithm: meta.EncryptionAlgorithm,
                        KeyId: meta.EncryptedDataKey
                    };
                    const decryptResponse = this._keyManager.decrypt(decryptRequest);
                    data[key] = decryptResponse.Plaintext;
                });
            }
        } else {
            log.debug('No secure store located for ' + dataId);
        }

        //Return decrypted data
        const response = new DataResponse(dataId);
        response.data = data;

        return Promise.resolve(response);
    }

    /**
     * 
     * @param {string} dataId the id associated with the data
     * @param {*} data plaintext JSON data
     * @returns {Promise} {@link DataResponse}
     * 
     * @see {@link https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html}
     */
    write(dataId, data) {

        const dataKeyResponse = this._keyManager.generateDataKey();

        const encryptedData = {
            _metadata: {
                EncryptionAlgorithm: '',
                EncryptedDataKey: dataKeyResponse.CiphertextBlob
            }
        }

        //Encrypt
        Object.keys(data).forEach(key => {
            const encryptRequest = {
                KeyId: dataKeyResponse.Plaintext,
                Plaintext: data[key]
            };

            const encryptResponse = this._keyManager.encrypt(encryptRequest);
            encryptedData._metadata.EncryptionAlgorithm = encryptResponse.EncryptionAlgorithm;
            encryptedData[key] = encryptResponse.CiphertextBlob;
        });

        //Save encrypted data
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