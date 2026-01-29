const child = require('child_process');

const config = require('./config.json');

// Import centralized logger instead of using Winston directly
const log = require('../logger'); // <-- updated path relative to this file

exports.initialize = function(app, callback) {
  if (!config.enable) {
    return callback();
  }

  log.info('activating epic plugin');

  startObservations();
  startAttachments();

  setImmediate(function() {
    callback();
  });
};

function startObservations() {
  const observations = config.esri.observations;

  if (observations.enable) {
    const observationsWorker = child.fork(__dirname + '/observations');

    observationsWorker.on('error', function(err) {
      log.error('***************** epic observation error ******************************', err);
      observationsWorker.kill();     // kill the worker if error occurs
      startObservations();           // restart the worker
    });

    observationsWorker.on('exit', function(exitCode) {
      log.warn('***************** epic observation exit, code ************************', exitCode);
      if (exitCode !== 0) {
        observationsWorker.kill();   // kill if it exited unexpectedly
        startObservations();         // restart the worker
      }
    });

    observationsWorker.on('uncaughtException', function(err) {
      log.error('***************** Observation worker uncaught exception: ***************** ' + err);
    });

    process.on('exit', function(err) {
      log.warn('***************** epic parent process exit, killing ********************', err);
      observationsWorker.kill();
    });
  }
}

function startAttachments() {
  const attachments = config.esri.attachments;

  if (attachments.enable) {
    const attachmentsWorker = child.fork(__dirname + '/attachments');

    attachmentsWorker.on('error', function(err) {
      log.error('epic attachment error', err);
      attachmentsWorker.kill(); // kill the worker on error
    });

    attachmentsWorker.on('exit', function(exitCode) {
      log.warn('epic attachment exit, code', exitCode);
      if (exitCode !== 0) {
        attachmentsWorker.kill(); // kill if exited unexpectedly
        startAttachments();       // restart worker
      }
    });

    attachmentsWorker.on('uncaughtException', function(err) {
      log.error('***************** Attachment worker uncaught exception: ***************** ' + err);
    });

    process.on('exit', function() {
      attachmentsWorker.kill();
    });
  }
}