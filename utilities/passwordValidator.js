var Setting = require('../models/setting')
  , log = require('winston');

function validate(strategy, password) {
    if (!strategy || !password) {
        log.warn('strategy or password is missing');
        return Promise.resolve(false);
    }

    return Setting.getSetting("security").then(securitySettings => {
        const passwordPolicy = securitySettings.settings[strategy].passwordPolicy;

        if(!passwordPolicy) {
            log.debug('No password policy is defined for the strategy named: ' + strategy);
            return Promise.resolve(true);
        }

        return Promise.resolve(true);
    });
}

function validateMinimumCharacters(passwordPolicy, password) {

}

function validateMaximumConsecutiveCharacters(passwordPolicy, password) {
    
}

function validateMinimumLowercaseCharacters(passwordPolicy, password) {
    
}

function validateMinimumUppercaseCharacters(passwordPolicy, password) {
    
}

function validateMinimumNumbers(passwordPolicy, password) {
    
}

function validateMinimumSpecialCharacters(passwordPolicy, password) {
    
}

module.exports = {
    validate
}