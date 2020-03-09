const environment = require('./environment/env');
const log = require('./logger');

import path from 'path';
import fs from 'fs-extra';
import mongoose from 'mongoose';
import express from 'express';

const mongooseLogger = log.loggers.get('mongoose');

mongoose.set('debug', function(this: mongoose.Collection, collection: any, method: any, query: any, doc: any, options: any) {
  mongooseLogger.log('mongoose', "%s.%s(%s, %s, %s)", collection, method, this.$format(query), this.$format(doc), this.$format(options));
});

mongoose.Error.messages.general.required = "{PATH} is required.";

log.info('Starting MAGE Server ...');

// Create directory for storing media attachments
const attachmentBase = environment.attachmentBaseDirectory;
fs.mkdirp(attachmentBase, function(err: any) {
  if (err) {
    log.error("Could not create directory to store MAGE media attachments. "  + err);
    throw err;
  } else {
    log.info("Using '" + attachmentBase + "' as base directory for observation attachments.");
  }
});

const iconBase = environment.iconBaseDirectory;
fs.mkdirp(iconBase, function(err: any) {
  if (err) {
    log.error("Could not create directory to store MAGE icons. "  + err);
  } else {
    log.info("Using '" + iconBase + "' as base directory for MAGE icons.");
  }
});

require('./migrate').runDatabaseMigrations()
  .then(() => {
    log.info('database initialized; loading plugins ...');
    var plugins = require(path.join('./plugins'));
    plugins.initialize(app, function(err: any) {
      if (err) {
        throw err;
      }
      log.info('opening app for connections ...');
      app.emit(MageReadyEvent);
    });

  })
  .catch((err: any) => {
    log.error('error initializing database: ' + err);
    process.exitCode = 1;
  });

export const MageReadyEvent: string = 'comingOfMage';
export const app = require('./express.js') as express.Application;
