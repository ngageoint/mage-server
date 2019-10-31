var angular = require('angular');
import adminTeams from './teams.component';

angular.module('mage')
  .component('adminTeams', adminTeams)
  .controller('AdminTeamController', require('./team.controller'))
  .controller('AdminTeamAccessController', require('./team.access.controller'))
  .controller('AdminTeamDeleteController', require('./team.delete.controller'))
  .controller('AdminTeamEditController', require('./team.edit.controller'));
