'use strict';

class PlaintextKeyManager {

    generateDataKey() {
        const dataKey = {
            CiphertextBlob: '',
            KeyId: '',
            Plaintext: ''
        };

        return dataKey;
    }

    encrypt(request = { KeyId: '', Plaintext: '' }) {
        const data = {
            CiphertextBlob: request.Plaintext,
            EncryptionAlgorithm: '',
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

module.exports = PlaintextKeyManager;