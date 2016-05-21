var fs = require('fs-extra')
  , path = require('path');

// install all plugins
fs.readdirSync(__dirname).map(function(file) {
  return path.join(__dirname, file);
}).filter(function(file) {
  return fs.statSync(file).isDirectory();
}).forEach(function(file) {
  require('./' + path.basename(file));
});
