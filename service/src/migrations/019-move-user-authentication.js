"use strict";

exports.id = 'move-user-authentication';

exports.up = async function (done) {
  try {
    this.log('Moving authentication from user model to authentication model');
    const authenticationCollection = await this.db.collection('authentications');
    const userCollection = await this.db.collection('users');
    migrateAuthentication(authenticationCollection, userCollection)
      .then(() => done())
      .catch(err => done(err));

  } catch (err) {
    this.log('Failed moving authentication to new model', err);
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

      this.log("Creating new authentication record for user " + user.username);
      await authenticationCollection.insertOne(userAuthentication);
      this.log('Authentication record successfully created for user ' + user.username);

      user.authenticationId = userAuthentication._id;
      this.log("Removing authentication section for user " + user.username);
      await userCollection.updateOne({ _id: user._id }, user);
      this.log("Successfully removed authentication section for user " + user.username);
    } else {
      this.log("Authentication section has already been moved for " + user.username);
    }
  }

  // Close the cursor, this is the same as reseting the query
  cursor.close(function (err) {
    if (err) this.log("Failed closing authentication move cursor", err);
  });

}
