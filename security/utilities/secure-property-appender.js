'use strict';

const SecretStoreService = require('../secret-store-service');

async function appendToConfig(config) {
    const sss = new SecretStoreService();

    const result = await sss.read(config._id.toString());
    if (result) {
        Object.keys(result).forEach(key => {
            config.settings[key] = result[key];
        });
    }
    return Promise.resolve(config);
}

module.exports = {
    appendToConfig
};