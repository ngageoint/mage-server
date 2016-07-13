var fs = require('fs');

module.exports = function(app, security) {
  // Dynamically import all routes
  fs.readdirSync(__dirname).forEach(function(file) {
    if (file[0] === '.' || file === 'index.js') return;
    var route = file.substr(0, file.indexOf('.'));
    require('./' + route)(app, security);
  });
};
