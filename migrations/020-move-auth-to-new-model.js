"use strict";

const log = require('winston');

exports.id = 'move-auth-to-new-model';

exports.up = function (done) {
    try {
        log.info('Moving authentication from user model to authentication model');
        const self = this;
        this.db.createCollection('authentications', { strict: true }, function (err, collection) {
            if (err) {
                log.warn(err);
                throw err;
            }
            self.db.collection('users', { strict: true }, function (err, userCollection) {
                if (err) {
                    log.warn(err);
                    throw err;
                }
                moveAuthentication(done, collection, userCollection);
            });
        });
    } catch (err) {
        log.warn('Failed moving authentication to new model', err);
        done(err);
    }
};

exports.down = function (done) {
    done();
};

async function moveAuthentication(done, authenticationCollection, userCollection) {
    const cursor = userCollection.find({});

    let hasNext = true;
    while (hasNext === true) {
        const hasNext = await cursor.hasNext().catch(err => { throw err });
        if (hasNext !== true) {
            break;
        }
        const user = await cursor.next().catch(err => { throw err });

        if (user.hasOwnProperty('authentication')) {
            const userAuthentication = user.authentication;
            delete user.authentication;
            delete userAuthentication._id;

            userAuthentication.userId = user._id;
            log.info("Creating new authentication record for user " + user.username);
            await authenticationCollection.insertOne(userAuthentication).catch(err => { throw err });
            log.info('Authentication record successfully created for user ' + user.username);

            user.authenticationId = userAuthentication._id;
            log.info("Removing authentication section for user " + user.username);
            await userCollection.updateOne({ _id: user._id }, user).catch(err => { throw err });
            log.info("Successfully removed authentication section for user " + user.username);
        } else {
            log.info("Authentication section has already been moved for " + user.username);
        }
    }

    log.debug("Closing cursor for authentication move");
    // Close the cursor, this is the same as reseting the query
    cursor.close(function (err, result) {
        if (err) {
            log.warn("Failed closing authentication move cursor", err);
        }
    });
    done();
}