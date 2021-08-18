"use strict";

const extend = require('util')._extend
    , AuthenticationConfiguration = require('../models/authenticationconfiguration')
    , AuthenticationConfigurationTransformer = require('../transformers/authenticationconfiguration');

/**
 * Appends authenticationStrategies to the config.api object (the original config.api is not modified; this method returns a copy).  
 * These strategies are read from the db.
 * 
 * @param {*} api 
 * @param {*} options 
 * @returns Promise containing the modified copy of the api parameter
 */
async function append(api, options) {
    options = options || {};

    const apiCopy = extend({}, api);
    delete apiCopy.authenticationStrategies;
    apiCopy.authenticationStrategies = {};

    const authenticationConfigurations = await AuthenticationConfiguration.Model.find();

    const filtered = authenticationConfigurations.filter(config => {
        if (!config.enabled) {
            if (options.includeDisabled) {
                return true;
            }
            return false;
        } else {
            return true;
        }
    });

    const transformedConfigurations = AuthenticationConfigurationTransformer.transform(filtered, options);
    transformedConfigurations.forEach(function (configuration) {
        apiCopy.authenticationStrategies[configuration.name] = extend({}, configuration);
    });
    return Promise.resolve(apiCopy);
}

module.exports = {
    append
};