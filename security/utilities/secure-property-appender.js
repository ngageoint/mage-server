'use strict';

const SecretStoreService = require('../secret-store-service');

async function appendToConfig(config) {
    const configCopy = JSON.parse(JSON.stringify(config));

    const sss = new SecretStoreService();

    const result = await sss.read(configCopy._id.toString());
    if (result && result.data) {
        
        if (!configCopy.settings) {
            configCopy['settings'] = {};
        }

        Object.keys(result.data).forEach(key => {
            configCopy.settings[key] = result.data[key];
        });
    }
    return Promise.resolve(configCopy);
}

module.exports = {
    appendToConfig
};