const environment = require('./environment/env');
const log = require('./logger');

import http from 'http';
import fs from 'fs-extra';
import mongoose from 'mongoose';
import express from 'express';


let service: MageService | null = null;

export type MageService = {
  app: express.Application,
  server: http.Server | null,
  open(): MageService,
};
export const MageReadyEvent = 'comingOfMage';
export const boot = async function(): Promise<MageService> {
  if (service) {
    return service;
  }

  const mongooseLogger = log.loggers.get('mongoose');
  mongoose.set('debug', function(this: mongoose.Collection, collection: any, method: any, query: any, doc: any, options: any) {
    mongooseLogger.log('mongoose', "%s.%s(%s, %s, %s)", collection, method, this.$format(query), this.$format(doc), this.$format(options));
  });

  mongoose.Error.messages.general.required = "{PATH} is required.";

  log.info('Starting MAGE Server ...');

  // Create directory for storing media attachments
  const attachmentBase = environment.attachmentBaseDirectory;
  log.info(`creating attachments directory at ${attachmentBase}`);
  try {
    await fs.mkdirp(attachmentBase)
  }
  catch (err) {
    log.error(`error creating attachments directory ${attachmentBase}: `, err);
    throw err;
  }

  const iconBase = environment.iconBaseDirectory;
  log.info(`creating icon directory at ${iconBase}`);
  try {
    await fs.mkdirp(iconBase)
  }
  catch (err) {
    log.error(`error creating icon directory ${iconBase}: `, err);
    throw err;
  }

  require('./models').initializeModels();
  try {
    await require('./migrate').runDatabaseMigrations()
  }
  catch (err) {
    log.error('error initializing database: ' + err);
    process.exitCode = 1;
  }

  const app = require('./express.js') as express.Application;

  function open(): MageService {
    service!.server = app.listen(environment.port, environment.address,
      () => log.info(`MAGE Server listening at address ${environment.address} on port ${environment.port}`));
    return service!
  };
  return service = {
    app,
    open,
    server: null
  };
};
