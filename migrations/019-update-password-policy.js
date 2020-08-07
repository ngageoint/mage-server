var Setting = require('../models/setting'),
    config = require('../config.js'),
    log = require('winston');

exports.id = 'update-password-policy';

exports.up = async function (done) {

    try {
        log.info('Adding password history to password policy');
        await addPasswordHistory(this.db);
        done();
    } catch (err) {
        log.warn('Failed updating password policy', err);
        done(err);
    }
};

exports.down = function (done) {
    done();
};

async function addPasswordHistory(db) {
    const authConfig = config.api.authenticationStrategies || {};

    let strategies = [];
    let strategy = {};
    for (strategy in authConfig) {
        strategies.push(strategy);
    }

    db.collection('settings', { strict: true }, function (err, collection) {
        if (err) {
            log.warn(err);
            throw err;
        }

        const cursor = collection.find({ type: 'security' });

        cursor.forEach(function (doc) {
            strategies.forEach(strategy => {
                if (doc.settings[strategy] && doc.settings[strategy].passwordPolicy) {
                    const passwordPolicy = doc.settings[strategy].passwordPolicy;
                    passwordPolicy.previousPasswordCount = 0;
                    passwordPolicy.previousPasswordCountEnabled = false;
                    if (passwordPolicy.helpTextTemplate) {
                        passwordPolicy.helpTextTemplate.previousPasswordCount =
                            'not be any of the past # previous passwords';
                    }
                }
            });
        }, function (err) {
            if (err) {
                log.warn("Failed to modify settings", err);
                throw err;
            }
        });

        // Close the cursor, this is the same as reseting the query
        cursor.close(function (err, result) {
            if (err) {
                log.warn("Failed to close cursor", err);
            }
        });
    });
}