var config = require('../config.js'),
    log = require('winston');

exports.id = 'add-password-history-setting';

exports.up = async function (done) {

    try {
        log.info('Adding password history to password policy');
        await addPasswordHistoryToSettings(this.db);
        done();
    } catch (err) {
        log.warn('Failed updating password policy', err);
        done(err);
    }
};

exports.down = function (done) {
    done();
};

async function addPasswordHistoryToSettings(db) {
    const authConfig = config.api.authenticationStrategies || {};

    let strategies = [];
    let strategy = {};
    for (strategy in authConfig) {
        strategies.push(strategy);
    }

    await db.collection('settings', { strict: true }, function (err, collection) {
        if (err) {
            log.warn(err);
            throw err;
        }

        const cursor = collection.find({ type: 'security' });

        log.debug("Iterating over collection using the following strategies " + strategies);

        cursor.forEach(function (doc) {
            log.debug("Processing " + doc._id);
            strategies.forEach(strategy => {

                if (doc.settings[strategy] && doc.settings[strategy].passwordPolicy) {
                    const passwordPolicy = doc.settings[strategy].passwordPolicy;
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
        });
    });
}