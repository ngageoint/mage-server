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
    "userBaseDirectory": "mage/users",
    "iconBaseDirectory": "mage/icons",
    "token": {
      "expiration": 28800
    },
    "mongodb": {
      "scheme": 'mongodb',
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
      "baseDirectory": "mage/attachments"
    }
  },
  defaults: {
    device: {
      name: null,
      uid: '12345',
      description: 'The default UID for admin user',
      registered: true
    },
    roles: [
      {
        name: "USER_ROLE",
        description: "User role, limited acces to MAGE API.",
        permissions: [
          'READ_DEVICE',
          'READ_EVENT_USER',
          'READ_TEAM',
          'READ_LAYER_EVENT',
          'READ_USER',
          'READ_ROLE',
          'CREATE_OBSERVATION', 'READ_OBSERVATION_EVENT', 'UPDATE_OBSERVATION_EVENT', 'DELETE_OBSERVATION',
          'CREATE_LOCATION', 'READ_LOCATION_EVENT', 'UPDATE_LOCATION_EVENT', 'DELETE_LOCATION']
      },
      {
        name: "ADMIN_ROLE",
        description: "Administrative role, full acces to entire MAGE API.",
        permissions: [
          'READ_SETTINGS', 'UPDATE_SETTINGS',
          'CREATE_DEVICE', 'READ_DEVICE', 'UPDATE_DEVICE', 'DELETE_DEVICE',
          'CREATE_USER', 'READ_USER', 'UPDATE_USER', 'DELETE_USER',
          'CREATE_ROLE', 'READ_ROLE', 'UPDATE_ROLE', 'DELETE_ROLE',
          'CREATE_EVENT', 'READ_EVENT_ALL', 'UPDATE_EVENT', 'DELETE_EVENT',
          'CREATE_LAYER', 'READ_LAYER_ALL', 'UPDATE_LAYER', 'DELETE_LAYER',
          'CREATE_OBSERVATION', 'READ_OBSERVATION_ALL', 'UPDATE_OBSERVATION_ALL', 'DELETE_OBSERVATION',
          'CREATE_LOCATION', 'READ_LOCATION_ALL', 'UPDATE_LOCATION_ALL', 'DELETE_LOCATION',
          'CREATE_TEAM', 'READ_TEAM', 'UPDATE_TEAM', 'DELETE_TEAM']
      }
    ],
    user: {
      username: 'admin',
      displayName: 'Admin',
      roleId: "ROLE_ADMIN",
      active: 'true',
      authentication: {
        type: 'local',
        password: 'password'
      }
    },
    layers: [
      {
        name: "Open Street Map",
        type: "Imagery",
        format: "XYZ",
        base: true,
        url: "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      }
    ]
  }
};
