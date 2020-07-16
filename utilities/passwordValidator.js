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
        isValid = isValid && validateMaximumConsecutiveCharacters(passwordPolicy, password);
        isValid = isValid && validateMinimumLowercaseCharacters(passwordPolicy, password);
        isValid = isValid && validateMinimumUppercaseCharacters(passwordPolicy, password);
        isValid = isValid && validateMinimumNumbers(passwordPolicy, password);

        return Promise.resolve(isValid);
    });
}

function validateMinimumCharacters(passwordPolicy, password) {
    let isValid = true;
    if (passwordPolicy.minCharsEnabled) {
        let passwordCount = 0;
        for (let i = 0; i < password.length; i++) {
            let a = password[i];

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
        let conCount = 0;
        for (let i = 0; i < password.length; i++) {
            let a = password[i];

            if (a.match(/[a-z]/i)) {
                conCount++;
            }

            if (conCount > passwordPolicy.maxConChars) {
                isValid = false;
                break;
            }
        }
    }
    return isValid;
}

function validateMinimumLowercaseCharacters(passwordPolicy, password) {
    let isValid = true;
    if (passwordPolicy.lowLettersEnabled) {
        let passwordCount = 0;
        for (let i = 0; i < password.length; i++) {
            let a = password[i];

            if (a.match(/[a-z]/)) {
                passwordCount++;
            }
        }
        isValid = passwordCount >= passwordPolicy.lowLetters;
    }
    return isValid;
}

function validateMinimumUppercaseCharacters(passwordPolicy, password) {
    let isValid = true;
    if (passwordPolicy.highLettersEnabled) {
        let passwordCount = 0;
        for (let i = 0; i < password.length; i++) {
            let a = password[i];

            if (a.match(/[A-Z]/)) {
                passwordCount++;
            }
        }
        isValid = passwordCount >= passwordPolicy.highLetters;
    }
    return isValid;
}

function validateMinimumNumbers(passwordPolicy, password) {
    let isValid = true;
    if (passwordPolicy.numbersEnabled) {
        let passwordCount = 0;
        for (let i = 0; i < password.length; i++) {
            let a = password[i];

            if (a.match(/[0-9]/)) {
                passwordCount++;
            }
        }
        isValid = passwordCount >= passwordPolicy.numbers;
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