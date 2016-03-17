var package = require('./package');
var version = package.version.split(".");

module.exports = {
  api: {
    "name": package.name,
    "description": package.description,
    "version": {
      "major": version[0],
      "minor": version[1],
      "micro": version[2]
    },
    "authenticationStrategies": {
      "local": {
        "passwordMinLength": 14
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
    // "locationServices": true,
    // "apk": {
    //   "version": "4.0.0",
    //   "supportedVersions": [
    //     "4.0",
    //     "5.1"
    //   ]
    // }
  },
  server: {
    "locationServices": {
      // "enabled": true,
      "userCollectionLocationLimit": 100
    }
  }
};
