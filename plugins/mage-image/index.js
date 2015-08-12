var child = require('child_process')
  , log = require('winston')
  , config = require('./config.json');

if (!config.enable) return;

log.info('activating image plugin');

function start() {
  // start worker
  var worker = child.fork(__dirname + '/process');

  worker.on('error', function(err) {
    log.error('********************** image plugin error **************************', err);
    worker.kill();
    start();
  });

  worker.on('exit', function(exitCode) {
    log.warn('********************** image plugin exit, code **********************', exitCode);
    if (exitCode != 0) {
      start();
    }
  });

  worker.on('uncaughtException', function(err) {
    log.error('*************************** image plugin uncaught exception *******************', err);
    worker.kill();
    start();
  });

  process.on('exit', function(err) {
    log.warn('***************** image plugin parent process exit, killing ********************', err);
    worker.kill();
  });
}

start();
