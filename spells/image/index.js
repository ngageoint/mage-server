var child = require('child_process');

console.log('activating image plugin');

function start() {
  // start worker
  worker = child.fork(__dirname + '/process');

  worker.on('error', function(err) {
    console.log('image plugin error', err);
    worker.kill();
  });

  worker.on('exit', function(exitCode) {
    console.log('image plugin exit, code', exitCode);
    if (exitCode != 0) {
      start();
    }
  });

  worker.on('uncaughtException', function(err) {
    console.log('image plugin uncaught exception', err);
  })
}

start();