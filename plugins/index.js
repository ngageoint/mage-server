var fs = require('fs-extra')
  , path = require('path');

var plugins = {};

// install all plugins
fs.readdirSync(__dirname).map(function(file) {
  return path.join(__dirname, file);
}).filter(function(file) {
  return fs.statSync(file).isDirectory();
}).forEach(function(file) {
  var pluginName = path.basename(file);
  plugins[pluginName] = require('./' + pluginName);
});

module.exports = plugins;
