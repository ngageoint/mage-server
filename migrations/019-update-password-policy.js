var Setting = require('../models/setting'),
    config = require('../config.js'),
    log = require('winston');

exports.id = 'update-password-policy';

exports.up = async function (done) {

    try {
        log.info('Adding password history to password policy');
        await addPasswordHistory();
        done();
    } catch (err) {
        log.warn('Failed updating password policy', err);
        done(err);
    }
};

exports.down = function (done) {
    done();
};

async function addPasswordHistory() {
    const authConfig = config.api.authenticationStrategies || {};

    let strategies = [];
    let strategy = {};
    for (strategy in authConfig) {
        strategies.push(strategy);
    }

    Setting.getSetting('security').then(securitySettings => {
        strategies.forEach(strategy => {
            if (securitySettings.settings[strategy]) {
                if (securitySettings.settings[strategy].passwordPolicy) {
                    log.info('Updating password policy for ' + strategy);

                    const passwordPolicy = securitySettings.settings[strategy].passwordPolicy;
                    passwordPolicy.previousPasswordCount = 0;
                    passwordPolicy.previousPasswordCountEnabled = false;
                    if (passwordPolicy.helpTextTemplate) {
                        passwordPolicy.helpTextTemplate.previousPasswordCount =
                            'not be any of the past # previous passwords';
                    }

                    Setting.updateSettingByType('security', securitySettings);
                } else {
                    log.info('No password policy defined for strategy ' + strategy);
                }
            }
        });
    });
}