'use strict';

class DoNothingKeyManager {

    generateDataKey(request = { KeyId: '' }) {
        const dataKey = {
            CiphertextBlob: '',
            KeyId: request.KeyId,
            Plaintext: ''
        };

        return dataKey;
    }

    encrypt(request = { KeyId: '', EncryptionAlgorithm: '', Plaintext: '' }) {
        const data = {
            CiphertextBlob: request.Plaintext,
            EncryptionAlgorithm: request.EncryptionAlgorithm,
            KeyId: request.KeyId
        };

        return data;
    }

    decrypt(request = { CiphertextBlob: '', EncryptionAlgorithm: '', KeyId: '' }) {
        const data = {
            EncryptionAlgorithm: request.EncryptionAlgorithm,
            KeyId: request.KeyId,
            Plaintext: request.CiphertextBlob
        }

        return data;
    }
}

module.exports = DoNothingKeyManager;