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
        access.authorize('READ_AUTH_CONFIG'),
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
        access.authorize('UPDATE_AUTH_CONFIG'),
        function (req, res, next) {
            const updatedConfig = {
                _id: req.body._id,
                name: req.body.name,
                type: req.body.type,
                title: req.body.title,
                textColor: req.body.textColor,
                buttonColor: req.body.buttonColor,
                icon: req.body.icon,
                enabled: req.body.enabled,
                settings: {}
            };

            const settings = JSON.parse(req.body.settings);

            Object.keys(settings).forEach(key => {
                updatedConfig.settings[key] = settings[key];
            });

            AuthenticationConfiguration.update(req.param('id'), updatedConfig).then(config => {
                 //TODO use whitelist??
                const transformedConfig = AuthenticationConfigurationTransformer.transform(config);
                res.json(transformedConfig);
                next();
            }).catch(err => {
                next(err);
            });
        });
};