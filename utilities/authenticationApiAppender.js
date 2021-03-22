"use strict";

const extend = require('util')._extend
    , AuthenticationConfiguration = require('../models/authenticationconfiguration')
    , AuthenticationConfigurationTransformer = require('../transformers/authenticationconfiguration');

module.exports = {
    append
};

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

    let apiCopy = extend({}, api);
    delete apiCopy.authenticationStrategies;
    apiCopy.authenticationStrategies = {};

    const authenticationConfigurations = await AuthenticationConfiguration.Model.find();
    const transformedConfigurations = AuthenticationConfigurationTransformer.transform(authenticationConfigurations, options);
    transformedConfigurations.forEach(function (configuration) {
        apiCopy.authenticationStrategies[configuration.type] = extend({}, configuration);
    });
    return Promise.resolve(apiCopy);
}