const util = require('util')
  , log = require('winston')
  , hasher = require('./pbkdf2')();

const SPECIAL_CHARS = '~!@#$%^&*(),.?":{}|<>_=;-';
const validPassword = util.promisify(hasher.validPassword);

async function validate(passwordPolicy, { password, previousPasswords: previousHashedPasswords }) {
  if (!password) {
    return {
      valid: false,
      errorMsg: 'Password is missing'
    };
  }

  const invalid = 
    !validatePasswordLength(passwordPolicy, password) ||
    !validateMinimumCharacters(passwordPolicy, password) ||
    !validateMaximumConsecutiveCharacters(passwordPolicy, password) ||
    !validateMinimumLowercaseCharacters(passwordPolicy, password) ||
    !validateMinimumUppercaseCharacters(passwordPolicy, password) ||
    !validateMinimumNumbers(passwordPolicy, password) ||
    !validateMinimumSpecialCharacters(passwordPolicy, password) ||
    !(await validatePasswordHistory(passwordPolicy, password, previousHashedPasswords));

  return {
    valid: !invalid,
    errorMsg: invalid ? passwordPolicy.helpText : null
  };
}

function validatePasswordLength(passwordPolicy, password) {
  let isValid = true;
  if (passwordPolicy.passwordMinLengthEnabled) {
    isValid = password.length >= passwordPolicy.passwordMinLength;
  }

  log.debug('Password meets min length: ' + isValid);

  return isValid;
}

function validateMinimumCharacters(passwordPolicy, password) {
  let isValid = true;
  if (passwordPolicy.minCharsEnabled) {
    let passwordCount = 0;
    for (let i = 0; i < password.length; i++) {
      const a = password[i];

      if (a.match(/[a-z]/i)) {
        passwordCount++;
      }
    }

    isValid = passwordCount >= passwordPolicy.minChars;
    log.debug('Password meets miniminum letters: ' + isValid);
  }
  return isValid;
}

function validateMaximumConsecutiveCharacters(passwordPolicy, password) {
  let isValid = true;
  if (passwordPolicy.maxConCharsEnabled) {
    let conCount = 0;
    for (let i = 0; i < password.length; i++) {
      const a = password[i];

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
    log.debug('Password meets max consecutive letters: ' + isValid);
  }
  return isValid;
}

function validateMinimumLowercaseCharacters(passwordPolicy, password) {
  let isValid = true;
  if (passwordPolicy.lowLettersEnabled) {
    let passwordCount = 0;
    for (let i = 0; i < password.length; i++) {
      const a = password[i];

      if (a.match(/[a-z]/)) {
        passwordCount++;
      }
    }
    isValid = passwordCount >= passwordPolicy.lowLetters;
    log.debug('Password meets minimum lowercase letters: ' + isValid);
  }
  return isValid;
}

function validateMinimumUppercaseCharacters(passwordPolicy, password) {
  let isValid = true;
  if (passwordPolicy.highLettersEnabled) {
    let passwordCount = 0;
    for (let i = 0; i < password.length; i++) {
      const a = password[i];

      if (a.match(/[A-Z]/)) {
        passwordCount++;
      }
    }
    isValid = passwordCount >= passwordPolicy.highLetters;
    log.debug('Password meets minimum uppercase letters: ' + isValid);
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
    log.debug('Password meets minimum numbers: ' + isValid);
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
      const a = password[i];

      if (nonAllowedRegex && a.match(nonAllowedRegex)) {
        specialCharCount = -1;
        break;
      }

      if (a.match(regex)) {
        specialCharCount++;
      }
    }
    isValid = specialCharCount >= passwordPolicy.specialChars;
    log.debug('Password meets special characters policy: ' + isValid);
  }
  return isValid;
}

function createRestrictedRegex(restrictedChars) {
  let nonAllowedRegex = '';

  for (let i = 0; i < SPECIAL_CHARS.length; i++) {
    const specialChar = SPECIAL_CHARS[i];

    if (!restrictedChars.includes(specialChar)) {
      nonAllowedRegex += specialChar;
    }
  }

  return nonAllowedRegex;
}

async function validatePasswordHistory(passwordPolicy, password, passwords) {
  if (!passwordPolicy.passwordHistoryCountEnabled || !passwords) return Promise.resolve(true);

  const policyPasswords = passwords.slice(0, passwordPolicy.passwordHistoryCount);
  const results = await Promise.all(policyPasswords.map(policyPassword => validPassword(password, policyPassword)));
  return !results.includes(true);
}

module.exports = {
  validate
}