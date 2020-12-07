'use strict';

const async = require('async')
  , fs = require('fs-extra')
  , path = require('path')
  , log = require('winston');

exports.initialize = function(app, callback) {
  // set up scheduled jobs
  const files = fs.readdirSync(__dirname).map(function(file) {
    return path.join(__dirname, file);
  }).filter(function(file) {
    return fs.statSync(file).isDirectory();
  });

  async.eachSeries(files, function(file, done) {
    const jobName = path.basename(file);
    log.info('Scheduling job ' + jobName);
    const job = require('./' + jobName);
    job.initialize(app, done);
  }, function(err) {
    if (err) {
      log.error('Error initializing job', err);
    }

    callback(err);
  });
};