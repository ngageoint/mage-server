var config = require('../config.js'),
    log = require('winston');

exports.id = 'set-default-password-policy';

exports.up = function (done) {
    log.info('Setting default password policy');

    try {
        setDefaultPasswordPolicy(this.db, done);
    } catch (err) {
        log.info('Failed to set the default password policy', err);
        done(err);
    }
};

exports.down = function (done) {
    done();
};

function setDefaultPasswordPolicy(db, done) {

    db.collection('settings', { strict: true }, function (err, collection) {
        if (err) {
            log.warn(err);
            throw err;
        }

        collection.count({ type: 'security' }, null, function (err, count) {
            if (err) {
                log.warn(err);
                throw err;
            }

            if (count == 0) {
                const securitySettings = {
                    type: 'security',
                    settings: {
                        local: {}
                    }
                };
                log.info("Creating new security settings for the local strategy");
                collection.insertOne(securitySettings, function (err, result) {
                    if (err) {
                        log.warn("Failed to insert new security settings", err);
                        throw err;
                    }

                    if (result.insertedCount == 1) {
                        addPolicyToCollection(collection, done);
                    } else {
                        log.warn("Failed to insert security settings.  Inserted count was " + result.insertedCount);
                    }
                });
            } else {
                addPolicyToCollection(collection, done);
            }
        });
    });
}

function addPolicyToCollection(collection, done) {
    const defaultPasswordPolicySettings = {
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
        helpText: null,
        helpTextTemplate: {
            minChars: 'have at least # letters',
            maxConChars: 'not contain more than # consecutive letters',
            lowLetters: 'have a minimum of # lowercase letters',
            highLetters: 'have a minimum of # uppercase letters',
            numbers: 'have at least # numbers',
            specialChars: 'have at least # special characters',
            restrictSpecialChars: 'be restricted to these special characters: #',
            passwordMinLength: 'be at least # characters in length'
        }
    }

    const authConfig = config.api.authenticationStrategies || {};

    let strategies = [];
    let strategy = {};
    for (strategy in authConfig) {
        if (strategy == 'local') {
            strategies.push(strategy);
        }
    }

    log.debug('Found the following strategies: ' + strategies);

    const cursor = collection.find({ type: 'security' });

    cursor.forEach(function (doc) {
        strategies.forEach(strategy => {
            log.debug("Checking " + doc._id + " against strategy " + strategy + " for password");
            if (doc.settings && doc.settings.hasOwnProperty(strategy)) {
                log.debug("Checking to see if " + doc._id + " already has a password policy");
                if (!doc.settings[strategy].passwordPolicy) {
                    doc.settings[strategy].passwordPolicy = defaultPasswordPolicySettings;

                    log.info("Adding password policy to " + doc._id);
                    collection.updateOne({ _id: doc._id }, doc).then(() => { }).catch(err => {
                        log.warn(err);
                    });
                } else {
                    log.info(doc._id + " already has a password policy defined");
                }
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
}