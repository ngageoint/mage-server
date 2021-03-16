const config = require('../config.js'),
  log = require('winston');

exports.id = 'copy-auth-from-config-to-db';

//local auth strategy will be done in a later migration since it was previously migrated to the settings collection.
const knownAuthStrategies = ['saml', 'ldap', 'google', 'geoaxis', 'login-gov'];

exports.up = function (done) {
  log.info('Copying authentication strategies from config.js to the DB');

  try {
    const authDbObjects = createDBObjectsFromConfig();

    //Save DB objects to DB
    this.db.createCollection('authenticationconfigurations').then(collection => {
      if (authDbObjects.length > 0) {
        log.info('Inserting ' + authDbObjects.length + ' authentication strategies into the DB');
        collection.insertMany(authDbObjects, {}, done);
      } else {
        done();
      }
    }).catch(err => {
      log.error(err);
      done(err);
    });
  } catch (err) {
    log.warn("Failed while copying authentication strategies to the DB", err);
    done(err);
  }
};

exports.down = function (done) {
  done();
};

function createDBObjectsFromConfig() {
  const authDbObjects = [];

  if (config.api && config.api.authenticationStrategies) {
    //Copy configs to DB objects
    for (let i = 0; i < knownAuthStrategies.length; i++) {
      const authStratName = knownAuthStrategies[i];
      const authStratConfig = config.api.authenticationStrategies[authStratName];
      if (authStratConfig) {
        log.debug("Copying " + authStratName + " auth strategy");

        const authDbObject = {};
        const authStratConfigKeys = Object.keys(authStratConfig);
        for (let j = 0; j < authStratConfigKeys.length; j++) {
          const key = authStratConfigKeys[i];
          authDbObject[key] = authStratConfig[key];
        }
        log.debug('Strategy ' + authStratName + ' DB object:' + JSON.stringify(authDbObject));
        authDbObjects.push(authDbObject);
      }
    }
  }

  return authDbObjects;
}