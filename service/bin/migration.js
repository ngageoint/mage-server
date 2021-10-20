#! /usr/bin/env node
/* eslint-disable @typescript-eslint/no-use-before-define */
const path = require('path');
const fs = require('fs');
const { program: prog } = require('commander');
const env = require('../lib/environment/env');
const mongoose = require('mongoose');

mongoose.set('debug', true)
const srcMigrationsDir = path.resolve(__dirname, '..', 'src', 'migrations');
prog.version('0');
prog.command('create <name>')
  .description('generate a new migration script in the migrations directory')
  .action(name => {
    // had to do this intead of mongodb-migrations's Migrator.create() because
    // that tries to require() all the migration files instead of just finding
    // the next ordinal to assign.  loading the migration files with require()
    // fails because they cannot load the typescript modules in the source tree.
    const migrationFiles = parseMigrationFileNames();
    const last = migrationFiles[migrationFiles.length - 1] || null
    const next = last ? last.ordinal + 1 : 1;
    const nextFormatted = String(next).padStart(3, '0');
    const migrationFileName = `${nextFormatted}-${name}.js`;
    const migrationPath = path.resolve(srcMigrationsDir, migrationFileName);
    const stub = require('mongodb-migrations/lib/migration-stub')(name);
    fs.writeFileSync(migrationPath, stub);
    console.log(`created migration stub ${migrationPath}`);
  });
prog.command('run')
  .description('apply all the migrations in lib/migrations directory.  make sure you npm run build first!')
  .action(async () => {
    const { uri, connectRetryDelay, connectTimeout, options } = env.mongo
    const { waitForDefaultMongooseConnection } = require('../lib/adapters/adapters.db.mongoose')
    await waitForDefaultMongooseConnection(mongoose, uri, connectTimeout, connectRetryDelay, options)
    const { runDatabaseMigrations } = require('../lib/migrate')
    await runDatabaseMigrations(env.mongo.uri, env.mongo.options)
    return mongoose.connection.close()
  });
prog.parse(process.argv);
function parseMigrationFileNames() {
  const files = fs.readdirSync(srcMigrationsDir);
  return files.filter(function (f) {
    return path.extname(f) === '.js' && !f.startsWith('.');
  }).map(function (f) {
    let ordinal = null;
    const numericPrefix = f.match(/^(\d+)/);
    if (numericPrefix) {
      ordinal = parseInt(numericPrefix[1]);
    }
    if (!ordinal) {
      throw new Error(`migration file does not have numeric ordering prefix: ${f}`);
    }
    return {
      ordinal,
      name: f
    };
  }).sort(function (f1, f2) {
    return f1.ordinal - f2.ordinal;
  })
}