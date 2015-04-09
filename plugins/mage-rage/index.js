var child = require('child_process')
  , config = require('./config.json')

if (!config.enable) return;

function start() {
  console.log('activating rage plugin');
  var rage = child.fork(__dirname + '/rage');

  rage.on('error', function(err) {
    console.log('***************** rage error ******************************', err);
    rage.kill();
    start();
  });

  rage.on('exit', function(exitCode) {
    console.log('***************** rage exit, code ************************', exitCode);
    if (exitCode != 0) {
      rage.kill();
      start();
    }
  });

  process.on('exit', function() {
    console.log('***************** rage parent process exit, killing ********************', err);
    rage.kill();
  });

}
start();
