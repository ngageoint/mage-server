var angular = require('angular');

angular.module('mage')
  .controller('AdminTeamController', require('./team.controller'))
  .controller('AdminTeamAccessController', require('./team.access.controller'))
  .controller('AdminTeamDeleteController', require('./team.delete.controller'))
  .controller('AdminTeamEditController', require('./team.edit.controller'))
  .controller('AdminTeamsController', require('./teams.controller'));
