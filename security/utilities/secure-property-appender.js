'use strict';

const SecretStoreService = require('../secret-store-service')
    , AuthenticationConfiguration = require('../../models/authenticationconfiguration')

/**
 * Helper function to append secure properties to a configuration under the settings property.
 * 
 * @param {*} config Must contain the _id property
 * @returns A copy of the config with secure properties appended (if any exist)
 */
async function appendToConfig(config) {
    const configCopy = config; //JSON.parse(JSON.stringify(config));

    const sss = new SecretStoreService();

    const result = await sss.read(configCopy._id.toString());
    if (result && result.data) {

        if (!configCopy.settings) {
            configCopy['settings'] = {};
        }

        Object.keys(result.data).forEach(key => {
            if(AuthenticationConfiguration.blacklist.includes(key.toLowerCase())) {
                configCopy.settings[key] = result.data[key];
            }
        });
    }
    return Promise.resolve(configCopy);
}

module.exports = {
    appendToConfig
};