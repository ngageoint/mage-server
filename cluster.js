var cluster = require('cluster')
  , http = require('http')
  , os = require('os')
  , log = require('winston');

var cpus = os.cpus().length;

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < cpus; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    log.warn('worker ' + worker.process.pid + ' died');
  });
} else {
  require('./mage');
}
