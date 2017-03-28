var fs = require('fs')
  , path = require('path')
  , cp = require('child_process');

fs.readdirSync('plugins').map(function(file) {
  return path.join('plugins', file);
}).filter(function(file) {
  return fs.statSync(file).isDirectory();
}).filter(function(file) {
  return fs.readdirSync(file).indexOf('package.json') !== -1;
}).forEach(function(plugin) {
  console.log('npm install on ', plugin);
  cp.spawn('npm', ['install'], {env: process.env, cwd: plugin, stdio: 'inherit'});
});
