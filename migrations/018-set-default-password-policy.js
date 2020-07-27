var Setting = require('../models/setting'),
    config = require('../config.js'),
    log = require('winston');

exports.id = 'set-default-password-policy';

exports.up = async function (done) {
    log.info('Setting default password policy');

    try {
        await setDefaultPasswordPolicy();
        done();
    } catch (err) {
        log.info('Failed to set the default password policy', err);
        done(err);
    }
};

exports.down = function (done) {
    done();
};

async function setDefaultPasswordPolicy() {
    const defaultPasswordPolicySettings = {
        passwordMinLength: 0,
        passwordMinLengthEnabled: false
    }

    const authConfig = config.api.authenticationStrategies || {};

    let strategies = [];
    let strategy = {};
    for (strategy in authConfig) {
        strategies.push(strategy);
    }

    log.debug('Found the following strategies: ' + strategies);

    Setting.getSetting('security').then(securitySettings => {
        strategies.forEach(strategy => {
            if (!securitySettings.settings[strategy]) {
                securitySettings.settings[strategy] = {};
            }

            if (!securitySettings.settings[strategy].passwordPolicy) {
                log.info('Setting password policy for ' + strategy);
                securitySettings.settings[strategy].passwordPolicy = defaultPasswordPolicySettings;

                Setting.updateSettingByType('security', securitySettings);
            } else {
                log.info('Password policy already set for ' + strategy);
            }
        });
    });
}