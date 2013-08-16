var cluster = require('cluster')
  , http = require('http')
  , os = require('os');

var cpus = os.cpus().length;

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < cpus; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
  require('./mage');
}