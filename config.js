module.exports = {
  api: {
    "name": "MAGE (Mobile Awareness GEOINT Environment)",
    "version": {
      "major": 4,
      "minor": 0,
      "micro": 0
    },
    "authenticationStrategies": {
      "local": {
        "passwordMinLength": 1
      },
      // "google": {
      //   "url": " ",
      //   "callbackURL": " ",
      //   "clientID": " ",
      //   "clientSecret": " "
      // }
    },
    "provision": {
      "strategy": "uid"
    },
    "locationServices": true,
    "apk": {
      "version": "4.0.0",
      "supportedVersions": [
        "4.0",
        "5.1"
      ]
    }
  },
  server: {
    "locationServices": {
      "enabled": true,
      "userCollectionLocationLimit": 100
    }
  }
};
