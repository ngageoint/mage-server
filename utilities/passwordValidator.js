var Setting = require('../models/setting')
    , log = require('winston');

function validate(strategy, password) {
    if (!strategy || !password) {
        log.warn('strategy or password is missing');
        return Promise.resolve(false);
    }

    return Setting.getSetting("security").then(securitySettings => {
        const passwordPolicy = securitySettings.settings[strategy].passwordPolicy;

        if (!passwordPolicy) {
            log.debug('No password policy is defined for the strategy named: ' + strategy);
            return Promise.resolve(true);
        }

        let isValid = validateMinimumCharacters(passwordPolicy, password);

        return Promise.resolve(isValid);
    });
}

function validateMinimumCharacters(passwordPolicy, password) {
    let isValid = true;
    if (passwordPolicy.minCharsEnabled) {
        const lowerPass = password.toLowerCase();
        let passwordCount = 0;
        for (let i = 0; i < lowerPass.length; i++) {
            let a = lowerPass[i];
            
            if (a.match(/[a-z]/i)) {
                passwordCount++;
            }
        }
        isValid = passwordCount >= passwordPolicy.minChars;
    }
    return isValid;
}

function validateMaximumConsecutiveCharacters(passwordPolicy, password) {
    let isValid = true;
    if (passwordPolicy.maxConCharsEnabled) {
    }
    return isValid;
}

function validateMinimumLowercaseCharacters(passwordPolicy, password) {
    let isValid = true;
    if (passwordPolicy.lowLettersEnabled) {
    }
    return isValid;
}

function validateMinimumUppercaseCharacters(passwordPolicy, password) {
    let isValid = true;
    if (passwordPolicy.highLettersEnabled) {
    }
    return isValid;
}

function validateMinimumNumbers(passwordPolicy, password) {
    let isValid = true;
    if (passwordPolicy.numbersEnabled) {
    }
    return isValid;
}

function validateMinimumSpecialCharacters(passwordPolicy, password) {
    let isValid = true;
    if (passwordPolicy.specialCharsEnabled) {
    }
    return isValid;
}

module.exports = {
    validate
}