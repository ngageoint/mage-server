var package = require('./package');
var version = package.version.split(".");

module.exports = {
  api: {
    "name": package.name,
    "description": package.description,
    "version": {
      "major": parseInt(version[0]),
      "minor": parseInt(version[1]),
      "micro": parseInt(version[2])
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
