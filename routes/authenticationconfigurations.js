'use strict';

const log = require('winston')
    , access = require('../access')
    , Authentication = require('../models/authentication')
    , AuthenticationConfiguration = require('../models/authenticationconfiguration')
    , AuthenticationConfigurationTransformer = require('../transformers/authenticationconfiguration')
    , Settings = require('../models/setting')
    , SecretStoreService = require('../security/secret-store-service');

module.exports = function (app, security) {

    const passport = security.authentication.passport;

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

    app.get(
        '/api/authentication/configuration/count/:id',
        passport.authenticate('bearer'),
        access.authorize('READ_AUTH_CONFIG'),
        function (req, res, next) {
            Authentication.countAuthenticationsByAuthConfigId(req.param('id')).then(cnt => {
                const response = {
                    count: cnt
                };
                res.json(response);
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

            const securityData = {};

            Settings.getSetting('blacklist').then(blacklist => {
                const settings = JSON.parse(req.body.settings);

                Object.keys(settings).forEach(key => {
                    if (blacklist && Object.keys(blacklist.settings).includes(key)) {
                        securityData[key] = settings[key];
                    } else {
                        updatedConfig.settings[key] = settings[key];
                    }
                });
                return AuthenticationConfiguration.update(req.param('id'), updatedConfig);
            }).then(config => {
                const response = [];
                response.push(Promise.resolve(config));
                if (Object.keys(securityData).length > 0) {
                    const sss = new SecretStoreService();
                    response.push(sss.write(config._id, securityData));
                }
                return Promise.all(response);
            }).then(response => {
                const config = response[0];
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

            const securityData = {};

            Settings.getSetting('blacklist').then(blacklist => {
                const settings = JSON.parse(req.body.settings);

                Object.keys(settings).forEach(key => {
                    if (blacklist && Object.keys(blacklist.settings).includes(key)) {
                        securityData[key] = settings[key];
                    } else {
                        newConfig.settings[key] = settings[key];
                    }
                });

                return AuthenticationConfiguration.create(newConfig);
            }).then(config => {
                const response = [];
                response.push(Promise.resolve(config));
                if (Object.keys(securityData).length > 0) {
                    const sss = new SecretStoreService();
                    response.push(sss.write(config._id, securityData));
                }
                return Promise.all(response);
            }).then(response => {
                const config = response[0];
                const promises = [];
                promises.push(Promise.resolve(config))
                promises.push(Authentication.getAuthenticationsByType(config.name));
                return Promise.all(promises);
            }).then(response => {
                const config = response[0];
                const authentications = response[1];

                const promises = [];
                promises.push(config);

                authentications.forEach(authentication => {
                    authentication.authenticationConfigurationId = config._id;
                    promises.push(Authentication.updateAuthentication(authentication));
                });
                return Promise.all(promises);
            }).then(response => {
                const config = response[0];
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
                    const authUpdatePromises = [];
                    authentications.forEach(authentication => {
                        if (authentication.type === 'local') {
                            throw new Error('Removal of local authentication is not allowed');
                        }
                        authentication.authenticationConfigurationId = null;
                        authUpdatePromises.push(Authentication.updateAuthentication(authentication));
                    });
                    return Promise.all(authUpdatePromises);
                }).then(() => {
                    return AuthenticationConfiguration.remove(req.param("id"));
                }).then(config => {
                    const response = [];
                    response.push(Promise.resolve(config));

                    const sss = new SecretStoreService();
                    response.push(sss.delete(config._id));
                    return Promise.all(response);
                }).then(response => {
                    const config = response[0];

                    log.info("Successfully removed strategy with id " + req.param("id"));
                    //TODO not sure how to disable passport strategy, but this will effectively disable it
                    const transformedConfig = AuthenticationConfigurationTransformer.transform(config);
                    res.json(transformedConfig);
                }).catch(err => {
                    next(err);
                });
        });
};