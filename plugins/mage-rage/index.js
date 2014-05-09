var child = require('child_process')
  , config = require('./config.json')

console.log('activating rage plugin');

if (!config.enable) return;

function startObservations() {
  var observations = config.observations;
  if (observations.enable) {
    // start observations worker
    var observationsWorker = child.fork(__dirname + '/observations');

    observationsWorker.on('error', function(err) {
      console.log('***************** rage observation error ******************************', err);
      observationsWorker.kill();
      startObservations();
    });

    observationsWorker.on('exit', function(exitCode) {
      console.log('***************** rage observation  exit, code ************************', exitCode);
      if (exitCode != 0) {
        observationsWorker.kill();
        startObservations();
      }
    });

    process.on('exit', function() {
      console.log('***************** rage parent process exit, killing ********************', err);
      observationsWorker.kill();
    });
  }
}
startObservations();

function startAttachments() {
  var attachments = config.attachments;
  if (attachments.enable) {
    // start attachments worker
    var attachmentsWorker = child.fork(__dirname + '/attachments');

    attachmentsWorker.on('error', function(err) {
      console.log('rage attachment error', err);
      attachmentsWorker.kill();
    });

    attachmentsWorker.on('exit', function(exitCode) {
      console.log('rage attachment  exit, code', exitCode);
      if (exitCode != 0) {
        attachmentsWorker.kill();
        startAttachments();
      }
    });

    process.on('exit', function() {
      attachmentsWorker.kill();
    });
  }
}
startAttachments();
