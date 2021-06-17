'use strict';

const DoNothingKeyManager = require('./do-nothing-key-manager');

class KeyMgtFactory {
    static _keyManager = new DoNothingKeyManager();

    static getKeyManager() {
        return this._keyManager;
    }
}

module.exports = KeyMgtFactory;