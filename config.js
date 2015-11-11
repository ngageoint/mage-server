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
        "passwordMinLength": 14
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
    "userBaseDirectory": "/var/lib/mage/users",
    "iconBaseDirectory": "/var/lib/mage/icons",
    "token": {
      "expiration": 28800
    },
    "mongodb": {
      "host": "localhost",
      "port": 27017,
      "db": "magedb",
      "poolSize": 5
    },
    "locationServices": {
      "enabled": true,
      "userCollectionLocationLimit": 100
    },
    "attachment": {
      "baseDirectory": "/var/lib/mage/attachments"
    }
  }
}
