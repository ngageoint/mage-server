const log = require('winston');

exports.id = 'copy-auth-from-config-to-db';

exports.up = async function (done) {
  log.info('Copying authentication strategies from config.js to the DB');

  try {
    // config.js never statically defined authenticationStrategies, so this
    // migration has always been a no-op; it remains only to create the index.
    const collection = await this.db.collection('authenticationconfigurations');
    await collection.createIndex(['type', 'name'], { unique: true });
    done();
  } catch (err) {
    log.warn("Failed while copying authentication strategies to the DB", err);
    done(err);
  }
};

exports.down = function (done) {
  done();
};