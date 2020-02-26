var fs = require('fs')
  , path = require('path')
  , cp = require('child_process');

fs.readdirSync('plugins').map(function(file) {
  return path.join('plugins', file);
}).filter(function(file) {
  return fs.statSync(file).isDirectory();
}).filter(function(file) {
  return fs.existsSync(path.join(file, 'package.json'));
}).forEach(function(plugin) {
  console.log('npm install on ', plugin);
  cp.spawn('npm', ['install'], {env: process.env, cwd: plugin, stdio: 'inherit'});
});
