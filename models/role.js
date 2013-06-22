module.exports = function() {

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

  var roleRoles = [
    'READ_ROLE'
  ];

  var roles = [].concat(teamRoles).concat(userRoles).concat(featureRoles).concat(roleRoles);

  getTeamRoles = function() {
    return teamRoles;
  }

  getUserRoles = function() {
    return userRoles;
  }

  getFeatureRoles = function() {
    return featureRoles;
  }

  getRoleRoles = function() {
    return roleRoles;
  }

  getRoles = function() {
    return roles;
  }

  return {
    getTeamRoles: getTeamRoles,
    getUserRoles: getUserRoles,
    getFeatureRoles: getFeatureRoles,
    getRoleRoles: getRoleRoles,
    getRoles: getRoles
  };
}()