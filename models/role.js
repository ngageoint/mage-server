module.exports = function() {

  var teamRoles = [
    'CREATE_TEAM',
    'UPDATE_TEAM',
    'DELETE_TEAM'
  ];

  var userRoles = [
    'CREATE_USER',
    'MODIFY_USER',
    'DELETE_USER',
  ]; 

  var featureRoles = [
    'CREATE_FEATURE',
    'MODIFY_FEATURE',
    'DELETE_FEATURE',
  ];

  var roles = [].concat(teamRoles).concat(userRoles).concat(featureRoles);

  getTeamRoles = function() {
    return teamRoles;
  }

  getUserRoles = function() {
    return userRoles;
  }

  getFeatureRoles = function() {
    return featureRoles;
  }

  getRoles = function() {
    return roles;
  }

  return {
    strategy: 'local',
    p***REMOVED***port: p***REMOVED***port
  };
}()