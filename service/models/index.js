const fs = require('fs-extra')
  , log = require('winston');

module.exports.initializeModels = function () {
  log.info('intializing database models ...');
  fs.readdirSync(__dirname).forEach(file => {
    if (file[0] === '.' || file === 'index.js') return;
    const model = file.substr(0, file.indexOf('.'));
    log.info(`intializing database model ${model} ...`);
    require('./' + model);
  });
};
