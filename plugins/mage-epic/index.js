var child = require('child_process')
  , config = require('./config.json')
  , log = require('winston');

exports.initialize = function(app, callback) {
  if (!config.enable) {
    return callback();
  }

  log.info('activating epic plugin');
  startObservations();
  startAttachments();

  // nothing async happening in setup
  setImmediate(function() {
    callback();
  });
};

function startObservations() {
  var observations = config.esri.observations;
  if (observations.enable) {
    // start observations worker
    var observationsWorker = child.fork(__dirname + '/observations');

    observationsWorker.on('error', function(err) {
      log.error('***************** epic observation error ******************************', err);
      observationsWorker.kill();
      startObservations();
    });

    observationsWorker.on('exit', function(exitCode) {
      log.warn('***************** epic observation  exit, code ************************', exitCode);
      if (exitCode !== 0) {
        observationsWorker.kill();
        startObservations();
      }
    });

    observationsWorker.on('uncaughtException', function(err) {
      log.error('*****************  Observation worker uncaught exception: ***************** ' + err);
    });

    process.on('exit', function(err) {
      log.warn('***************** epic parent process exit, killing ********************', err);
      observationsWorker.kill();
    });
  }
}

function startAttachments() {
  var attachments = config.esri.attachments;
  if (attachments.enable) {
    // start attachments worker
    var attachmentsWorker = child.fork(__dirname + '/attachments');

    attachmentsWorker.on('error', function(err) {
      log.error('epic attachment error', err);
      attachmentsWorker.kill();
    });

    attachmentsWorker.on('exit', function(exitCode) {
      log.warn('epic attachment  exit, code', exitCode);
      if (exitCode !== 0) {
        attachmentsWorker.kill();
        startAttachments();
      }
    });

    attachmentsWorker.on('uncaughtException', function (err) {
      log.error('*****************  Attachment worker uncaught exception: ***************** ' + err);
    });

    process.on('exit', function() {
      attachmentsWorker.kill();
    });
  }
}
