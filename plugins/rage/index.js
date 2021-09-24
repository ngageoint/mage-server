var child = require('child_process')
  , log = require('winston')
  , config = require('./config.json');

exports.initialize = function(app, callback) {
  if (!config.enable) {
    return callback();
  }

  log.info('activating rage plugin');
  start();

  // nothing async happening in setup
  setImmediate(function() {
    callback();
  });
};

function start() {
  var rage = child.fork(__dirname + '/rage');

  rage.on('error', function(err) {
    log.error('***************** rage error ******************************', err);
    rage.kill();
    start();
  });

  rage.on('exit', function(exitCode) {
    log.warn('***************** rage exit, code ************************', exitCode);
    if (exitCode !== 0) {
      rage.kill();
      start();
    }
  });

  process.on('exit', function(err) {
    log.warn('***************** rage parent process exit, killing ********************', err);
    rage.kill();
  });
}
