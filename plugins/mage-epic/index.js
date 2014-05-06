var child = require('child_process')
  , config = require('config.json');

console.log('activating epic plugin');

function startObservations() {
  var observations = config.epic.observations;
  if (observations.enable) {
    // start observations worker
    observationsWorker = child.fork(__dirname + '/observations');

    observationsWorker.on('error', function(err) {
      console.log('epic observation error', err);
      observationsWorker.kill();
    });

    observationsWorker.on('exit', function(exitCode) {
      console.log('epic observation  exit, code', exitCode);
      if (exitCode != 0) {
        startObservations();
      }
    });

    observationsWorker.on('uncaughtException', function(err) {
      console.log('epic observation uncaught exception', err);
    });
  }
}
startObservations();

function startAttachments() {
  var attachments = config.epic.attachments;
  if (attachments) {
    // start attachments worker
    attachmentsWorker = child.fork(__dirname + '/attachments');

    attachmentsWorker.on('error', function(err) {
      console.log('epic attachment error', err);
      attachmentsWorker.kill();
    });

    attachmentsWorker.on('exit', function(exitCode) {
      console.log('epic attachment  exit, code', exitCode);
      if (exitCode != 0) {
        start();
      }
    });

    attachmentsWorker.on('uncaughtException', function(err) {
      console.log('epic attachment uncaught exception', err);
    });
  }
}
startAttachments();