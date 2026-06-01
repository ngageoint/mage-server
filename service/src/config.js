const packageJson = require('../package');
const version = packageJson.version


module.exports = {
  api: {
    name: packageJson.name,
    nodeVersion: process.versions.node,
    description: packageJson.description,
    version: version,
  },
  server: {
    locationServices: {
      "userCollectionLocationLimit": 100
    }
  }
};
