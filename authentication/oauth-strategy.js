'use strict';

const util = require('util')
    , OAuth2Strategy = require('passport-oauth2').Strategy
    , InternalOAuthError = require('passport-oauth2').InternalOAuthError;

function Strategy(options, verify) {
    this.profileURL = options.profileURL;
    OAuth2Strategy.call(this, options, verify);
    this.name = 'MAGE';
}

/**
 * Inherit from `OAuth2Strategy`.
 */
util.inherits(Strategy, OAuth2Strategy);

Strategy.prototype.userProfile = function (accessToken, done) {
    this._oauth2.get(this.profileURL, accessToken, function (err, body) {
        if (err) { return done(new InternalOAuthError('failed to fetch user profile', err)); }

        try {
            /**
             * https://datatracker.ietf.org/doc/html/draft-smarr-vcarddav-portable-contacts-00
             */
            const json = JSON.parse(body);

            const profile = {};
            profile.provider = 'oauth';
            profile._raw = body;
            profile._json = json;

            done(null, profile);
        } catch (e) {
            done(e);
        }
    });
};

module.exports.Strategy = Strategy;