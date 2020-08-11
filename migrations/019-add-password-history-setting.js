var config = require('../config.js'),
    log = require('winston');

exports.id = 'add-password-history-setting';

exports.up = function (done) {

    try {
        log.info('Adding password history to password policy');
        addPasswordHistoryToSettings(this.db, done);
    } catch (err) {
        log.warn('Failed updating password policy', err);
        done(err);
    }
};

exports.down = function (done) {
    done();
};

async function addPasswordHistoryToSettings(db, done) {
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
                log.info("Checking " + doc._id + " against strategy " + strategy + " for password history");
                if (doc.settings && doc.settings.hasOwnProperty(strategy)
                    && doc.settings[strategy].passwordPolicy) {
                    const passwordPolicy = doc.settings[strategy].passwordPolicy;
                    if (passwordPolicy.passwordHistoryCount === undefined) {
                        passwordPolicy.passwordHistoryCount = 0;
                        passwordPolicy.passwordHistoryCountEnabled = false;
                        if (passwordPolicy.helpTextTemplate) {
                            passwordPolicy.helpTextTemplate.passwordHistoryCount =
                                'not be any of the past # previous passwords';
                        }
                        log.info("Adding password history settings to " + doc._id);
                        collection.updateOne({ _id: doc._id }, doc).then(() => { }).catch(err => {
                            log.warn(err);
                        });
                    } else {
                        log.info(doc._id + " already has a password history defined");
                    }
                } else {
                    log.info(strategy + " strategy does not have a password policy, so not adding password history");
                }
            });
        }, function (err) {
            if (err) {
                log.warn("Failed to modify settings", err);
                throw err;
            }

            log.debug("Closing cursor");
            // Close the cursor, this is the same as reseting the query
            cursor.close(function (err, result) {
                if (err) {
                    log.warn("Failed to close cursor", err);
                }
            });
            done();
        });
    });
}