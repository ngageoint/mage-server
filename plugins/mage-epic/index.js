var child = require('child_process')
  , config = require('./config.json')

if (!config.enable) return;

console.log('activating epic plugin');

function startObservations() {
  var observations = config.esri.observations;
  if (observations.enable) {
    // start observations worker
    var observationsWorker = child.fork(__dirname + '/observations');

    observationsWorker.on('error', function(err) {
      console.log('***************** epic observation error ******************************', err);
      observationsWorker.kill();
      startObservations();
    });

    observationsWorker.on('exit', function(exitCode) {
      console.log('***************** epic observation  exit, code ************************', exitCode);
      if (exitCode != 0) {
        observationsWorker.kill();
        startObservations();
      }
    });

    process.on('exit', function() {
      console.log('***************** epic parent process exit, killing ********************', err);
      observationsWorker.kill();
    });
  }
}
startObservations();

function startAttachments() {
  var attachments = config.esri.attachments;
  if (attachments.enable) {
    // start attachments worker
    var attachmentsWorker = child.fork(__dirname + '/attachments');

    attachmentsWorker.on('error', function(err) {
      console.log('epic attachment error', err);
      attachmentsWorker.kill();
    });

    attachmentsWorker.on('exit', function(exitCode) {
      console.log('epic attachment  exit, code', exitCode);
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
