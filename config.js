var packageJson = require('./package');
var version = packageJson.version.split(".");

module.exports = {
  api: {
    "name": packageJson.name,
    "description": packageJson.description,
    "version": {
      "major": parseInt(version[0]),
      "minor": parseInt(version[1]),
      "micro": parseInt(version[2])
    },
    "authenticationStrategies": {
      "local": {
        "passwordMinLength": 1
      }
      // "google": {
      //   "url": " ",
      //   "callbackURL": " ",
      //   "clientID": " ",
      //   "clientSecret": " "
      // }
    },
    "provision": {
      "strategy": "uid"
    }
  },
  server: {
    "locationServices": {
      // "enabled": true,
      "userCollectionLocationLimit": 100
    }
  }
};
