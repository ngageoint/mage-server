var fs = require('fs-extra');

// install all plugins
fs.readdirSync(__dirname).forEach(function(plugin) {
  if (plugin[0] == '.' || plugin === 'index.js') return;
  require('./' + plugin);
});