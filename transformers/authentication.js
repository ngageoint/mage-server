"use strict";

const Authentication = require('../models/authentication');

function transformAuthentication(authentication, options) {
    if (!authentication) return null;

    authentication = authentication.toObject ? authentication.toObject({ whitelist: options.whitelist, path: options.path, transform: Authentication.transform }) : authentication;

    return authentication;
};

function transformAuthentications(authentications, options) {
    authentications = authentications.map(function (authentication) {
        return transformAuthentication(authentication, options);
    });

    return authentications;
};

exports.transform = function (authentications, options) {
    options = options || {};

    return Array.isArray(authentications) ? transformAuthentications(authentications, options) : transformAuthentication(authentications, options);
};