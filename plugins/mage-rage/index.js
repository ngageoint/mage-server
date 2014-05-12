var child = require('child_process')
  , config = require('./config.json')

console.log('activating rage plugin');

if (!config.enable) return;

function startData() {
  var data = config.data;
  if (data.enable) {
    // start observations worker
    var dataWorker = child.fork(__dirname + '/data');

    dataWorker.on('error', function(err) {
      console.log('***************** rage observation error ******************************', err);
      dataWorker.kill();
      startData();
    });

    dataWorker.on('exit', function(exitCode) {
      console.log('***************** rage observation  exit, code ************************', exitCode);
      if (exitCode != 0) {
        dataWorker.kill();
        startData();
      }
    });

    process.on('exit', function() {
      console.log('***************** rage parent process exit, killing ********************', err);
      dataWorker.kill();
    });
  }
}
startData();

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
