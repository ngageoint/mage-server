'use strict';

const PlaintextKeyManager = require('./plaintext-key-manager');

class KeyMgtFactory {
    static _keyManager = new PlaintextKeyManager();

    static getKeyManager() {
        return this._keyManager;
    }
}

module.exports = KeyMgtFactory;