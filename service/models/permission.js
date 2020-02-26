var devicePermissions = [
  'CREATE_DEVICE',
  'READ_DEVICE',
  'UPDATE_DEVICE',
  'DELETE_DEVICE'
];

var userPermissions = [
  'CREATE_USER',
  'READ_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'UPDATE_USER_ROLE',
  'UPDATE_USER_PASSWORD'
];

var rolePermissions = [
  'CREATE_ROLE',
  'READ_ROLE',
  'UPDATE_ROLE',
  'DELETE_ROLE'
];

var eventPermissions = [
  'READ_EVENT_ALL',
  'READ_EVENT_USER',
  'CREATE_EVENT',
  'UPDATE_EVENT',
  'DELETE_EVENT'
];

var layerPermissions = [
  'READ_LAYER_ALL',
  'READ_LAYER_EVENT',
  'UPDATE_LAYER',
  'CREATE_LAYER',
  'DELETE_LAYER'
];

var observationPermissions = [
  'READ_OBSERVATION_ALL',
  'READ_OBSERVATION_EVENT',
  'READ_OBSERVATION_TEAM',
  'READ_OBSERVATION_USER',
  'UPDATE_OBSERVATION_ALL',
  'UPDATE_OBSERVATION_EVENT',
  'UPDATE_OBSERVATION_TEAM',
  'UPDATE_OBSERVATION_USER',
  'CREATE_OBSERVATION',
  'DELETE_OBSERVATION'
];

var locationPermissions = [
  'READ_LOCATION_ALL',
  'READ_LOCATION_EVENT',
  'READ_LOCATION_TEAM',
  'READ_LOCATION_USER',
  'UPDATE_LOCATION_ALL',
  'UPDATE_LOCATION_EVENT',
  'UPDATE_LOCATION_TEAM',
  'UPDATE_LOCATION_USER',
  'CREATE_LOCATION',
  'DELETE_LOCATION'
];

var teamPermissions = [
  'CREATE_TEAM',
  'READ_TEAM',
  'UPDATE_TEAM',
  'DELETE_TEAM'
];

var settingPermissions = [
  'READ_SETTINGS',
  'UPDATE_SETTINGS'
];

var allPermissions = []
  .concat(devicePermissions)
  .concat(userPermissions)
  .concat(rolePermissions)
  .concat(eventPermissions)
  .concat(layerPermissions)
  .concat(observationPermissions)
  .concat(locationPermissions)
  .concat(teamPermissions)
  .concat(settingPermissions);

exports.getPermissions = function() {
  return allPermissions;
};
