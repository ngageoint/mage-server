'use strict';

module.exports = function (app, security) {

    const log = require('winston')
        , passport = security.authentication.passport
        , access = require('../access')
        , Authentication = require('../models/authentication')
        , AuthenticationConfiguration = require('../models/authenticationconfiguration')
        , AuthenticationConfigurationTransformer = require('../transformers/authenticationconfiguration')
        , User = require('../models/user');

    app.get(
        '/api/authentication/configuration/',
        passport.authenticate('bearer'),
        access.authorize('READ_AUTH_CONFIG'),
        function (req, res, next) {
            AuthenticationConfiguration.getAllConfigurations().then(configs => {
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

            AuthenticationConfiguration.getById(req.param('id')).then(originalConfig => {
                // add back blacklisted settings, unless the client updated them
                if (originalConfig.settings) {
                    Object.keys(originalConfig.settings).forEach(key => {
                        //TODO what if the client deleted the setting alltogether??
                        if (!updatedConfig.settings[key] && AuthenticationConfiguration.SettingsBlacklist.includes(key)) {
                            updatedConfig.settings[key] = originalConfig.settings[key];
                        }
                    });
                }
                return AuthenticationConfiguration.update(req.param('id'), updatedConfig);
            }).then(config => {
                log.info("Reconfiguring authentication strategy " + config.type + " (" + config.name + ")");
                let strategyType = config.type;
                if (config.type === 'oauth') {
                    strategyType = config.name.toLowerCase();
                }
                const strategy = require('../authentication/' + strategyType);
                strategy.configure(passport, config);

                const transformedConfig = AuthenticationConfigurationTransformer.transform(config);
                res.json(transformedConfig);
            }).catch(err => {
                next(err);
            })
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

            AuthenticationConfiguration.create(newConfig).then(config => {
                log.info("Creating new authentication strategy " + config.type + " (" + config.name + ")");
                let strategyType = config.type;
                if (config.type === 'oauth') {
                    strategyType = config.name.toLowerCase();
                }
                const strategy = require('../authentication/' + strategyType);
                strategy.configure(passport, config);

                const transformedConfig = AuthenticationConfigurationTransformer.transform(config);
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

            Authentication.getAuthenticationsByAuthConfigId(req.param('id'))
                .then(authentications => {
                    const userPromises = [];
                    authentications.forEach(authentication => {
                        userPromises.push(User.getUserByAuthenticationId(authentication._id));
                    });
                    return Promise.all(userPromises);
                }).then(users => {
                    const removeUserPromises = [];
                    users.forEach(user => {
                        removeUserPromises.push(user.remove());
                    });
                    return Promise.all(removeUserPromises);
                }).then(() => {
                    return AuthenticationConfiguration.remove(req.param("id"));
                }).then(config => {
                    log.info("Successfully removed strategy with id " + req.param("id"));
                    //TODO not sure how to disable passport strategy, but this will effectively disable it
                    const transformedConfig = AuthenticationConfigurationTransformer.transform(config);
                    res.json(transformedConfig);
                }).catch(err => {
                    next(err);
                });
        });
};