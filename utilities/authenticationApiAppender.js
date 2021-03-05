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
 */
function append(api) {
    return Authentication.Model.find().then(authenticationStrategies => {
        const transformedStrategies = AuthenticationTransformer.transform(authenticationStrategies, { whitelist: true });

        transformedStrategies.forEach(function (strategy) {
            api.authenticationStrategies[strategy.type] = extend({}, strategy);
        });

        return Promise.resolve(api);
    });
}