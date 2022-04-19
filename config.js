const packageJson = require('./package');
const version = packageJson.version.split(".");

module.exports = {
  api: {
    name: packageJson.name,
    description: packageJson.description,
    version: {
      major: parseInt(version[0]),
      minor: parseInt(version[1]),
      micro: parseInt(version[2])
    }
  },
  server: {
    locationServices: {
      "userCollectionLocationLimit": 100
    }
  }
};
