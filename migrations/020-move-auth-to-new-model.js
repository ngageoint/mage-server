"use strict";

const log = require('winston');

exports.id = 'move-auth-to-new-model';

exports.up = function (done) {
    try {
        log.info('Moving authentication from user model to authentication model');
        const self = this;
        this.db.createCollection('authentication', { strict: true }, function (err, collection) {
            if (err) {
                log.warn(err);
                return done(err);
            }
            moveAuthentication(self.db, done, collection);
        });
    } catch (err) {
        log.warn('Failed moving authentication to new model', err);
        done(err);
    }
};

exports.down = function (done) {
    done();
};

async function moveAuthentication(db, done, authenticationCollection) {
    db.collection('users', { strict: true }, function (err, userCollection) {
        if (err) {
            log.warn(err);
            throw err;
        }

        const cursor = userCollection.find({});

        cursor.forEach(function (doc) {
            const userAuthentication = doc.authentication;

            if (userAuthentication) {
                log.info("Moving authentication section of user: " + doc.username);
                delete doc.authentication;
                userAuthentication.userId = doc._id;

                authenticationCollection.insertOne(userAuthentication, function (err, result) {
                    if (err) {
                        log.warn(err);
                        throw err;
                    }

                    //TODO save user
                });
            } else {
                log.info("Authentication section has already been moved for " + doc.username);
            }
        }, function (err) {
            if (err) {
                log.warn("Failed to move authentication", err);
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