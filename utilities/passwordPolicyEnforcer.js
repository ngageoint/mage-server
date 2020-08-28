"use strict"

const Setting = require('../models/setting')
    , log = require('winston');

function enforce(strategy, existingAuth, auth) {
    return Setting.getSetting("security").then(securitySettings => {
        const passwordPolicy = securitySettings.settings[strategy].passwordPolicy;

        if (!passwordPolicy) {
            log.debug('No password policy is defined for the strategy named: ' + strategy);
            return true;
        }

        enforcePasswordHistory(existingAuth, auth, passwordPolicy);
    });
}

function enforcePasswordHistory(existingAuth, auth, passwordPolicy) {

    let history = [];
    if (passwordPolicy.passwordHistoryCountEnabled) {
        if (existingAuth) {
            history.push(existingAuth.password);
            history = history.concat(existingAuth.previousPasswords);

            if (passwordPolicy.passwordHistoryCount < history.length) {
                history = history.slice(0, passwordPolicy.passwordHistoryCount);
            }
        }
    }
    auth.previousPasswords = history;
}

module.exports = {
    enforce
}