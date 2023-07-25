"use strict";

const config = require('../config.js'),
  log = require('winston');

exports.id = 'set-default-password-policy';

const passwordPolicy = {
  minCharsEnabled: false,
  minChars: 0,
  maxConCharsEnabled: false,
  maxConChars: 0,
  lowLettersEnabled: false,
  lowLetters: 0,
  highLettersEnabled: false,
  highLetters: 0,
  numbersEnabled: false,
  numbers: 0,
  specialCharsEnabled: false,
  specialChars: 0,
  restrictSpecialCharsEnabled: false,
  restrictSpecialChars: "",
  passwordMinLength: 14,
  passwordMinLengthEnabled: true,
  customizeHelpText: false,
  helpText: 'Your password is invalid and must be at least 14 characters in length.',
  helpTextTemplate: {
    minChars: 'have at least # letters',
    maxConChars: 'not contain more than # consecutive letters',
    lowLetters: 'have a minimum of # lowercase letters',
    highLetters: 'have a minimum of # uppercase letters',
    numbers: 'have at least # numbers',
    specialChars: 'have at least # special characters',
    restrictSpecialChars: 'be restricted to these special characters: #',
    passwordMinLength: 'be at least # characters in length',
    passwordHistoryCount: 'not be any of the past # previous passwords'
  },
  passwordHistoryCount: 0,
  passwordHistoryCountEnabled: false
};

exports.up = function (done) {
  log.info('Setting default password policy');

  if (config.api.authenticationStrategies && config.api.authenticationStrategies['local']) {
    const local = config.api.authenticationStrategies['local'];
    if (local.passwordMinLength) {
      passwordPolicy.passwordMinLength = local.passwordMinLength;
    }
  }

  const update = {
    $rename: {
      'settings.accountLock': 'settings.local.accountLock'
    },
    $set: {
      'settings.local.passwordPolicy': passwordPolicy,
    }
  }

  this.db.collection('settings').findAndModify({ type: 'security' }, null, update, { upsert: true }, done);
};

exports.down = function (done) {
  done();
};