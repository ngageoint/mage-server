const
migrations = require('mongodb-migrations'),
log = require('winston'),
path = require('path'),
env = require('./environment/env'),
models = require('./models'),
waitForMongooseConnection = require('./utilities/waitForMongooseConnection'),
migrateConfig = require('./mm-config.js');

class MigrationContext {

  constructor() {
    this.migrator = new migrations.Migrator(migrateConfig, (level, msg) => {
      log.info(msg);
    });
  }
  
  runFromDir(dir) {
    return new Promise(function(resolve, reject) {
      this.resolve = resolve;
      this.reject = reject;
      this.migrator.runFromDir(dir, this.onFinished.bind(this), this.onProgress.bind(this));
    }.bind(this));
  }

  onProgress(id, result) {
    if (result.status == 'error') {
      log.error(`migration ${id} error: `, result.error);
    }
  }

  onFinished(err, results) {
    if (err) {
      log.error('database mirgrations failed: ', err);
      log.error('migration results:\n' + JSON.stringify(results, null, 2));
      process.exit(1);
    }
    this.resolve();
  }
}

module.exports.runDatabaseMigrations = function() {
  return waitForMongooseConnection()
    .then(function() {
      models.initializeModels();
      const migrationsDir = path.resolve(migrateConfig.directory);
      log.info(`running database migrations in directory ${migrationsDir} ...`);
      return new MigrationContext().runFromDir(migrationsDir);
    })
    .catch(function(err) {
      log.error(`error connecting to database:`, err);
      process.exit(1);
    });
};


