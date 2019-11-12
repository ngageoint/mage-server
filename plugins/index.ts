var async = require('async')
  , fs = require('fs-extra')
  , path = require('path')
  , log = require('winston');

exports.initialize = function(app, callback) {
  // install all plugins
  var files = fs.readdirSync(__dirname).map(function(file) {
    return path.join(__dirname, file);
  }).filter(function(file) {
    return fs.statSync(file).isDirectory();
  });

  async.eachSeries(files, function(file, done) {
    var pluginName = path.basename(file);
    var plugin = require('./' + pluginName);
    plugin.initialize(app, done);
  }, function(err) {
    if (err) {
      log.error('Error initializing plugins', err);
    }

    callback(err);
  });
};
