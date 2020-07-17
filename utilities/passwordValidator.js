var Setting = require('../models/setting')
    , log = require('winston');

const SPECIAL_CHARS = '~!@#$%^&*(),.?":{}|<>_=;-';

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
        isValid = isValid && validateMinimumSpecialCharacters(passwordPolicy, password);

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
            } else {
                conCount = 0;
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
        let regex = null;
        let nonAllowedRegex = null;
        if (passwordPolicy.restrictSpecialCharsEnabled) {
            nonAllowedRegex = new RegExp('[' + createRestrictedRegex(passwordPolicy.restrictSpecialChars) + ']');
            regex = new RegExp('[' + passwordPolicy.restrictSpecialChars + ']');
        } else {
            regex = new RegExp('[' + SPECIAL_CHARS + ']');
        }

        let specialCharCount = 0;
        for (let i = 0; i < password.length; i++) {
            let a = password[i];

            if(nonAllowedRegex && a.match(nonAllowedRegex)) {
                specialCharCount = -1;
                break;
            }

            if (a.match(regex)) {
                specialCharCount++;
            }
        }
        isValid = specialCharCount >= passwordPolicy.specialChars;
    }
    return isValid;
}

function createRestrictedRegex(restrictedChars) {
    let nonAllowedRegex = '';

    for(let i =0; i < SPECIAL_CHARS.length; i++) {
        let specialChar = SPECIAL_CHARS[i];

        if(!restrictedChars.includes(specialChar)) {
            nonAllowedRegex += specialChar;
        }
    }

    return nonAllowedRegex;
}

module.exports = {
    validate
}