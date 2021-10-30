'use strict';

const log = require('winston')
    , access = require('../access')
    , Authentication = require('../models/authentication')
    , AuthenticationConfiguration = require('../models/authenticationconfiguration')
    , AuthenticationConfigurationTransformer = require('../transformers/authenticationconfiguration')
    , SecretStoreService = require('../security/secret-store-service')
    , SecurePropertyAppender = require('../security/utilities/secure-property-appender');

module.exports = function (app, security) {

    const passport = security.authentication.passport;
    const blacklist = AuthenticationConfiguration.blacklist;

    app.get(
        '/api/authentication/configuration/',
        passport.authenticate('bearer'),
        access.authorize('READ_AUTH_CONFIG'),
        function (req, res, next) {
            const includeDisabled = req.query.includeDisabled === 'true' ? true :
                req.query.includeDisabled === 'false' ? false :
                    req.query.includeDisabled;
            AuthenticationConfiguration.getAllConfigurations().then(configs => {
                const filtered = configs.filter(config => {
                    if (!config.enabled) {
                        if (includeDisabled) {
                            return true;
                        }
                        return false;
                    } else {
                        return true;
                    }
                });

                const promises = [];
                
                filtered.forEach(config => {
                    promises.push(SecurePropertyAppender.appendToConfig(config));
                });

                return Promise.all(promises);
            }).then(configs => {
                const transformedConfigs = AuthenticationConfigurationTransformer.transform(configs, { blacklist: true });
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
            Authentication.countAuthenticationsByAuthConfigId(req.params.id).then(cnt => {
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

            const settings = JSON.parse(req.body.settings);

            Object.keys(settings).forEach(key => {
                if (blacklist && blacklist.indexOf(key.toLowerCase()) != -1) {
                    if(AuthenticationConfiguration.secureMask !== settings[key]) {
                        securityData[key] = settings[key];
                    }
                } else {
                    updatedConfig.settings[key] = settings[key];
                }
            });
            AuthenticationConfiguration.update(req.params.id, updatedConfig).then(config => {
                //Read any existing secure data (for append purposes)
                const promises = [];
                promises.push(Promise.resolve(config));
                const sss = new SecretStoreService();
                promises.push(sss.read(config._id));
                return Promise.all(promises);
            }).then(response => {
                //Update secure data if necessary
                const promises = [];
                promises.push(Promise.resolve(response[0]));

                if (Object.keys(securityData).length > 0) {
                    const config = response[0];
                    const dataResponse = response[1];
                    if (dataResponse.data) {
                        Object.keys(dataResponse.data).forEach(key => {
                            if (!securityData[key]) {
                                securityData[key] = dataResponse.data[key];
                            }
                        });
                    }
                    const sss = new SecretStoreService();
                    promises.push(sss.write(config._id, securityData));
                }
                return Promise.all(promises);
            }).then(response => {
                //Append secure data to config for the purposes of configuring passport
                const config = response[0];
                return SecurePropertyAppender.appendToConfig(config);
            }).then(config => {
                log.info("Reconfiguring authentication strategy " + config.type + " (" + config.title + ")");
                const strategy = require('../authentication/' + config.type);
                strategy.initialize(config);

                const transformedConfig = AuthenticationConfigurationTransformer.transform(config, { blacklist: true });
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

            const settings = JSON.parse(req.body.settings);

            Object.keys(settings).forEach(key => {
                if (blacklist && blacklist.indexOf(key.toLowerCase()) != -1) {
                    if(AuthenticationConfiguration.secureMask !== settings[key]) {
                        securityData[key] = settings[key];
                    }
                } else {
                    newConfig.settings[key] = settings[key];
                }
            });

            AuthenticationConfiguration.create(newConfig).then(config => {
                //Create secure data, if any
                const response = [];
                response.push(Promise.resolve(config));
                if (Object.keys(securityData).length > 0) {
                    const sss = new SecretStoreService();
                    response.push(sss.write(config._id, securityData));
                }
                return Promise.all(response);
            }).then(response => {
                // Read any authentications that could be attached to this config
                // For example: 
                // 1. authentications attached to saml
                // 2. saml removed
                // 3. Authentications attached to saml no longer have a config
                // 3. saml recreated
                // 4. Authentications are then atteched to this new config
                const config = response[0];
                const promises = [];
                promises.push(Promise.resolve(config))
                promises.push(Authentication.getAuthenticationsByType(config.name));
                return Promise.all(promises);
            }).then(response => {
                // Attach any "dangling" authentications to the new config
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
                // Append secure data to config for the purposes of configuring passport
                const config = response[0];
                return SecurePropertyAppender.appendToConfig(config);
            }).then(config => {
                log.info("Creating new authentication strategy " + config.type + " (" + config.title + ")");
                const strategy = require('../authentication/' + config.type);
                strategy.initialize(config);

                const transformedConfig = AuthenticationConfigurationTransformer.transform(config, { blacklist: true });
                res.json(transformedConfig);
            }).catch(err => next(err));
        });

    app.delete(
        '/api/authentication/configuration/:id',
        passport.authenticate('bearer'),
        access.authorize('UPDATE_AUTH_CONFIG'),
        function (req, res, next) {

            Authentication.getAuthenticationsByAuthConfigId(req.params.id)
                .then(authentications => {
                    //Set config to null for any attached authentications
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
                    //Remove config
                    return AuthenticationConfiguration.remove(req.params.id);
                }).then(config => {
                    //Remove any secure properties
                    const response = [];
                    response.push(Promise.resolve(config));

                    const sss = new SecretStoreService();
                    response.push(sss.delete(config._id));
                    return Promise.all(response);
                }).then(response => {
                    const config = response[0];

                    log.info("Successfully removed strategy with id " + req.params.id);
                    //TODO not sure how to disable passport strategy, but this will effectively disable it
                    const transformedConfig = AuthenticationConfigurationTransformer.transform(config, { blacklist: true });
                    res.json(transformedConfig);
                }).catch(err => {
                    next(err);
                });
        });
};