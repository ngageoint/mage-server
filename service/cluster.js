var cluster = require('cluster')
  , os = require('os')
  , log = require('winston');

var cpus = os.cpus().length;

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < cpus; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker) {
    log.warn('worker ' + worker.process.pid + ' died');
  });
} else {
  require('./mage');
}
