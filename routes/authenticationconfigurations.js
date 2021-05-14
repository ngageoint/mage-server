'use strict';

module.exports = function (app, security) {

    const log = require('winston')
        , passport = security.authentication.passport
        , access = require('../access')
        , AuthenticationConfiguration = require('../models/authenticationconfiguration')
        , AuthenticationConfigurationTransformer = require('../transformers/authenticationconfiguration');

    app.get(
        '/api/authentication/configuration/',
        passport.authenticate('bearer'),
        access.authorize('READ_AUTH_CONFIG'),
        function (req, res, next) {
            AuthenticationConfiguration.getAllConfigurations().then(configs => {
                //TODO use whitelist??
                const transformedConfigs = AuthenticationConfigurationTransformer.transform(configs);
                res.json(transformedConfigs);
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
                log.info("Reconfiguring authentication strategy " + config.type + " (" + config.name + ")");
                let strategyType = config.type;
                if(config.type === 'oauth') {
                    strategyType = config.name.toLowerCase();
                }
                const strategy = require('../authentication/' + strategyType);
                strategy.configure(passport);
                //TODO use whitelist??
                const transformedConfig = AuthenticationConfigurationTransformer.transform(config);
                res.json(transformedConfig);
            }).catch(err => {
                next(err);
            });
        });

    app.post(
        '/api/authentication/configuration/',
        passport.authenticate('bearer'),
        access.authorize('UPDATE_AUTH_CONFIG'),
        function (req, res, next) {
            const newConfig = {
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
                newConfig.settings[key] = settings[key];
            });

            AuthenticationConfiguration.Model.create(newConfig).then(model => {
                log.info("Creating new authentication strategy " + model.type + " (" + model.name + ")");
                let strategyType = model.type;
                if(model.type === 'oauth') {
                    strategyType = model.name.toLowerCase();
                }
                const strategy = require('../authentication/' + strategyType);
                strategy.configure(passport);
                //TODO use whitelist??
                const transformedConfig = AuthenticationConfigurationTransformer.transform(model);
                res.json(transformedConfig);
            }).catch(err => {
                next(err);
            })
        });

    app.delete(
        '/api/authentication/configuration/:id',
        passport.authenticate('bearer'),
        access.authorize('UPDATE_AUTH_CONFIG'),
        function (req, res, next) {
            AuthenticationConfiguration.remove(req.param("id")).then(config => {
                log.info("Successfully removed strategy with id " + req.param("id"));
                //TODO not sure how to disable passport strategy
                 //TODO use whitelist??
                 const transformedConfig = AuthenticationConfigurationTransformer.transform(config);
                 res.json(transformedConfig);
            }).catch(err => {
                next(err);
            })
        });
};