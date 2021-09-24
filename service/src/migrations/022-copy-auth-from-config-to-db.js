const config = require('../config.js'),
  log = require('winston');

exports.id = 'copy-auth-from-config-to-db';

function createDBObjectsFromConfig() {
  const authDbObjects = [];

  if (config.api && config.api.authenticationStrategies) {
    //Copy configs to DB objects
    Object.keys(config.api.authenticationStrategies).forEach(authStratName =>  {

      if (authStratName !== 'local') {
        const authStratConfig = config.api.authenticationStrategies[authStratName];

        log.debug("Copying " + authStratName + " auth strategy");

        let binIcon;
        if(authStratConfig.icon) {
           binIcon = Buffer.from(authStratConfig.icon, 'base64');
        }

        const authDbObject = {
          enabled: true,
          name: authStratName,
          type: authStratConfig.type,
          title: authStratConfig.title,
          textColor: authStratConfig.textColor,
          buttonColor: authStratConfig.buttonColor,
          icon: binIcon,
          settings: {
            newUserEvents: [],
            newUserTeams: [],
            usersReqAdmin: {
              enabled: true
            },
            devicesReqAdmin: {
              enabled: true
            }
          }
        };

        const nonSettingsKeys = ['name', 'type', 'title', 'textColor', 'buttonColor', 'icon'];
        const allKeys = Object.keys(authStratConfig);
        for (let i = 0; i < allKeys.length; i++) {
          const key = allKeys[i];
          if (nonSettingsKeys.includes(key)) {
            continue
          };
          authDbObject.settings[key] = authStratConfig[key];
        }
        log.debug('Strategy ' + authStratName + ' DB object:' + JSON.stringify(authDbObject));
        authDbObjects.push(authDbObject);
      }
    });
  }

  return authDbObjects;
}

exports.up = function (done) {
  log.info('Copying authentication strategies from config.js to the DB');

  try {
    const authDbObjects = createDBObjectsFromConfig();

    //Save DB objects to DB
    this.db.createCollection('authenticationconfigurations').then(collection => {
      return collection.createIndex(['type', 'name'], { unique: true });
    }).then(result => {
      if (result.error) {
        log.error(result.error);
        return done(result.error);
      }

      return Promise.resolve(this.db.collection('authenticationconfigurations'));
    }).then(collection => {
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