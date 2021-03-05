"use strict";

const extend = require('util')._extend
    , Authentication = require('../models/authentication')
    , AuthenticationTransformer = require('../transformers/authentication');

module.exports = {
    append
};

/**
 * Appends authenticationStrategies to the config.api object.  These strategies are read from the db.
 * 
 * @param {*} api 
 * @param {*} options 
 */
function append(api, options) {
    options = options || {};

    const apiCopy = extend({}, api);
    delete apiCopy.authenticationStrategies;
    apiCopy.authenticationStrategies = {};

    return Authentication.Model.find().then(authenticationStrategies => {
        const transformedStrategies = AuthenticationTransformer.transform(authenticationStrategies, options);

        transformedStrategies.forEach(function (strategy) {
            apiCopy.authenticationStrategies[strategy.type] = extend({}, strategy);
        });

        return Promise.resolve(apiCopy);
    });
}