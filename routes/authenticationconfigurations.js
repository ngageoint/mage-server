'use strict';

module.exports = function (app, security) {

    const log = require('winston')
        , passport = security.authentication.passport
        , access = require('../access')
        , AuthenticationConfiguration = require('../models/authenticationconfiguration')
        , AuthenticationConfigurationTransformer = require('../transformers/authenticationconfiguration');

    app.get(
        '/api/authentication/configuration/all',
        passport.authenticate('bearer'),
        //access.authorize('READ_AUTH_CONFIG'),
        function (req, res, next) {
            AuthenticationConfiguration.getAllConfigurations().then(configs => {
                //TODO use whitelist??
                const transformedConfigs = AuthenticationConfigurationTransformer.transform(configs);
                res.json(transformedConfigs);
                next();
            }).catch(err => {
                next(err);
            });
        });

    app.put(
        '/api/authentication/configuration/:id',
        passport.authenticate('bearer'),
        //access.authorize('UPDATE_AUTH_CONFIG'),
        function (req, res, next) {
            //TODO implement update
        });
};