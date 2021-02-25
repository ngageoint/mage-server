"use strict"

const config = require('../config.js'),
  log = require('winston');

exports.id = 'copy-auth-from-config-to-db';

//Skip local config, since it was handled in a previous migration.
const knownAuthStrategies = ['saml', 'ldap', 'google', 'geoaxis', 'login-gov'];

exports.up = function (done) {
  log.info('Copying authentication strategies from config.js to the DB');

  try {
    const authDbObjects = copyConfigs();
  
    //Save DB objects to DB
    if (authDbObjects && authDbObjects.length > 0) {
      this.db.collection('authentications', function (err, authCollection) {
        if (err) done(err);

        log.info('Inserting ' + authDbObjects.length + ' authentication objects into the DB');
        authCollection.insertMany(authDbObjects).then(() => {
          done();
        }).catch(err => {
          log.warn('Error caught while inserting authentication strategies to db', err);
          done(err);
        });
      });
    } else {
      log.info('No authentication strategies, other than local, are configured. Nothing inserted into the DB.');
      done();
    }
  } catch (err) {
    log.warn("Failed while copying authentication strategies to the DB", err);
    done(err);
  }
};

exports.down = function (done) {
  done();
};

function copyConfigs() {
  const authDbObjects = [];
  //Copy configs to DB objects
  for (let i = 0; i < knownAuthStrategies.length; i++) {
    const authStratName = knownAuthStrategies[i];
    const authStratConfig = config.api.authenticationStrategies[authStratName];
    if (authStratConfig) {
      log.info("Copying " + authStratName + " auth config");

      const authDbObject = {};
      const authStratConfigKeys = Object.keys(authStratConfig);
      for (let j = 0; j < authStratConfigKeys.length; j++) {
        const key = authStratConfigKeys[i];
        authDbObject[key] = authStratConfig[key];
      }
      log.debug('Strategy ' + authStratName + ' DB object:' + JSON.stringify(authDbObject));
      authDbObjects.push(authDbObject);
    } else {
      log.info('Authentication strategy ' + authStratName + ' is not configured, skipping');
    }
  }

  return authDbObjects;
}