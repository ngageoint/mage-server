const packageJson = require('../package');


module.exports = {
  api: {
    name: packageJson.name,
    nodeVersion: process.versions.node,
    description: packageJson.description,
    version: packageJson.version,
  },
  server: {
    locationServices: {
      "userCollectionLocationLimit": 100
    }
  }
};
