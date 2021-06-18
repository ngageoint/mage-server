'use strict';

/**
 * This class provides the minimum method signatures to "protect" data.  
 * 
 * Modeled after:
 * 
 * {@link https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#data-keys}
 * 
 * This class provides no protection of data.
 */
class PlaintextKeyManager {

    /**
     * 
     * @returns dataKey {CiphertextBlob - Encrypted data key, KeyId - key that was used to encrypt, Plaintext - Unencrypted data key}
     */
    generateDataKey() {
        const dataKey = {
            CiphertextBlob: '',
            KeyId: '',
            Plaintext: ''
        };

        return dataKey;
    }

    /**
     * 
     * @param {*} request {KeyId: Plaintext data key, Plaintext: Unencrypted data}
     * @returns Encrypted data
     */
    encrypt(request = { KeyId: '', Plaintext: '' }) {
        const data = {
            CiphertextBlob: request.Plaintext,
            EncryptionAlgorithm: '',
            KeyId: request.KeyId
        };

        return data;
    }

    /**
     * 
     * @param {*} request {CiphertextBlob: Encrypted data, EncryptionAlgorithm: Algorithm used to encrypt, KeyId: Encrypted data key}
     * @returns Decryped data
     */
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