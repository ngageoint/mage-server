import async from 'async';
import fs from 'fs-extra';
import path from 'path';
import * as express from 'express';
const log = require('winston');

type CallbackError = Error | null;

exports.initialize = function(app: express.Application, callback: (e?: CallbackError) => void) {
  // install all plugins
  var files = fs.readdirSync(__dirname).map(function(file) {
    return path.join(__dirname, file);
  }).filter(function(file) {
    return fs.statSync(file).isDirectory();
  });

  async.eachSeries(files,
    function(file, done) {
      const pluginName = path.basename(file);
      const plugin = require('./' + pluginName);
      plugin.initialize(app, done);
    },
    function(err?: CallbackError): void {
      if (err) {
        log.error('error initializing plugins', err);
      }
      callback(err);
    });
};
