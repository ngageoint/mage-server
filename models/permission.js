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
];

var rolePermissions = [
  'CREATE_ROLE',
  'READ_ROLE',
  'UPDATE_ROLE',
  'DELETE_ROLE'
];

var layerPermissions = [
  'CREATE_LAYER',
  'READ_LAYER',
  'UPDATE_LAYER',
  'DELETE_LAYER'
]

var featurePermissions = [
  'CREATE_FEATURE',
  'READ_FEATURE',
  'UPDATE_FEATURE',
  'DELETE_FEATURE',
];

var fftPermissions = [
  'CREATE_FFT',
  'READ_FFT',
  'UPDATE_FFT',
  'DELETE_FFT'
];

var teamPermissions = [
  'CREATE_TEAM',
  'READ_TEAM',
  'UPDATE_TEAM',
  'DELETE_TEAM'
];

var allPermissions = []
  .concat(devicePermissions)
  .concat(userPermissions)
  .concat(rolePermissions)
  .concat(layerPermissions)
  .concat(featurePermissions)
  .concat(fftPermissions)
  .concat(teamPermissions);

exports.getPermissions = function() {
  return allPermissions;
}