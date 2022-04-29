const log = require('winston');
const { modulesPathsInDir } = require('../utilities/loader');

module.exports.initializeModels = function () {
  log.info('intializing database models ...');
  modulesPathsInDir(__dirname).forEach(file => {
    const moduleName = file.slice(0, file.indexOf('.'));
    log.info(`intializing database model ${moduleName} ...`);
    require('./' + moduleName);
  });
};
