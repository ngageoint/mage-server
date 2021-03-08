"use strict";

const extend = require('util')._extend
    , Authentication = require('../models/authentication')
    , AuthenticationTransformer = require('../transformers/authentication');

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

    const authenticationStrategies = await Authentication.Model.find();
    const transformedStrategies = AuthenticationTransformer.transform(authenticationStrategies, options);
    transformedStrategies.forEach(function (strategy) {
        apiCopy.authenticationStrategies[strategy.type] = extend({}, strategy);
    });
    return Promise.resolve(apiCopy);
}