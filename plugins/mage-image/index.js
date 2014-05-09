var child = require('child_process');

console.log('activating image plugin');

function start() {
  // start worker
  var worker = child.fork(__dirname + '/process');

  worker.on('error', function(err) {
    console.log('********************** image plugin error **************************', err);
    worker.kill();
    start();
  });

  worker.on('exit', function(exitCode) {
    console.log('********************** image plugin exit, code **********************', exitCode);
    if (exitCode != 0) {
      start();
    }
  });

  worker.on('uncaughtException', function(err) {
    console.log('*************************** image plugin uncaught exception *******************', err);
    worker.kill();
    start();
  });

  process.on('exit', function() {
    console.log('***************** image plugin parent process exit, killing ********************', err);
    worker.kill();
  });
}

start();
