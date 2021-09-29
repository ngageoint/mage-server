"use strict";

const AuthenticationConfiguration = require('../models/authenticationconfiguration');

function transformAuthenticationConfiguration(authenticationConfiguration, options) {
    if (!authenticationConfiguration) return null;

    authenticationConfiguration = authenticationConfiguration.toObject ? authenticationConfiguration.toObject({ whitelist: options.whitelist, blacklist: options.blacklist, transform: AuthenticationConfiguration.transform }) : authenticationConfiguration;

    return authenticationConfiguration;
};

function transformAuthenticationConfigurations(authenticationConfigurations, options) {
    const transformed = [];
    authenticationConfigurations.forEach(authenticationConfiguration => {
        transformed.push(transformAuthenticationConfiguration(authenticationConfiguration, options));
    });

    return transformed;
};

exports.transform = function (authenticationConfigurations, options) {
    options = options || {};

    return Array.isArray(authenticationConfigurations) ? transformAuthenticationConfigurations(authenticationConfigurations, options) : transformAuthenticationConfiguration(authenticationConfigurations, options);
};