"use strict"

const Setting = require('../models/setting')
    , log = require('winston');

function enforce(strategy, existingUser, user) {
    return Setting.getSetting("security").then(securitySettings => {
        const passwordPolicy = securitySettings.settings[strategy].passwordPolicy;

        if (!passwordPolicy) {
            log.debug('No password policy is defined for the strategy named: ' + strategy);
            return true;
        }

        enforcePasswordHistory(existingUser, user, passwordPolicy);
    });
}

function enforcePasswordHistory(existingUser, user, passwordPolicy) {

    let history = [];
    if (passwordPolicy.passwordHistoryCountEnabled) {
        if (existingUser) {
            history.push(existingUser.authentication.password);
            history.push(existingUser.authentication.previousPasswords);

            if (passwordPolicy.passwordHistoryCount < history.length) {
                history = history.slice(0, passwordPolicy.passwordHistoryCount);
            }
        }
    }
    user.authentication.previousPasswords = history;
}

module.exports = {
    enforce
}