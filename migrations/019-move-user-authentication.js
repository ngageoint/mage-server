"use strict";

const log = require('winston');

exports.id = 'move-user-authentication';

exports.up = function (done) {
  try {
    log.info('Moving authentication from user model to authentication model');
    this.db.createCollection('authentications', (err, authenticationCollection) => {
      if (err) done(err);

      this.db.collection('users', function (err, userCollection) {
        if (err) done(err);

        migrateAuthentication(authenticationCollection, userCollection)
          .then(() => done())
          .catch(err => done(err));
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

async function migrateAuthentication(authenticationCollection, userCollection) {
  const cursor = userCollection.find({});

  let hasNext = true;
  while (hasNext === true) {
    hasNext = await cursor.hasNext()
    if (hasNext !== true) break;

    const user = await cursor.next()

    if (user.hasOwnProperty('authentication')) {
      const userAuthentication = user.authentication;
      delete user.authentication;
      delete userAuthentication._id;

      log.info("Creating new authentication record for user " + user.username);
      await authenticationCollection.insertOne(userAuthentication);
      log.info('Authentication record successfully created for user ' + user.username);

      user.authenticationId = userAuthentication._id;
      log.info("Removing authentication section for user " + user.username);
      await userCollection.updateOne({ _id: user._id }, user);
      log.info("Successfully removed authentication section for user " + user.username);
    } else {
      log.info("Authentication section has already been moved for " + user.username);
    }
  }

  // Close the cursor, this is the same as reseting the query
  cursor.close(function (err) {
    if (err) log.warn("Failed closing authentication move cursor", err);
  });

}