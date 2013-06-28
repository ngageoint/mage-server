var teamRoles = [
  'CREATE_TEAM',
  'READ_TEAM',
  'UPDATE_TEAM',
  'DELETE_TEAM'
];

var userRoles = [
  'CREATE_USER',
  'READ_USER',
  'MODIFY_USER',
  'DELETE_USER',
]; 

var featureRoles = [
  'CREATE_FEATURE',
  'READ_FEATURE',
  'MODIFY_FEATURE',
  'DELETE_FEATURE',
];

var fftRoles = [
  'CREATE_FFT',
  'READ_FFT',
  'MODIFY_FFT',
  'DELETE_FEATURE'
];

var roleRoles = [
  'READ_ROLE'
];

var roles = [].concat(teamRoles).concat(userRoles).concat(featureRoles).concat(fftRoles).concat(roleRoles);

exports.getTeamRoles = function() {
  return teamRoles;
}

exports.getUserRoles = function() {
  return userRoles;
}

exports.getFeatureRoles = function() {
  return featureRoles;
}

exports.getRoleRoles = function() {
  return roleRoles;
}

exports.getRoles = function() {
  return roles;
}