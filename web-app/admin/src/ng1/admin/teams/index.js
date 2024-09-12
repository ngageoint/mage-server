var angular = require('angular');
import adminTeams from './teams.component';
import adminTeam from './team.component';
import adminTeamEdit from './team.edit.component';
import adminTeamAccess from './team.access.component';
import adminTeamDelete from './team.delete.component';

angular.module('mage')
  .component('adminTeams', adminTeams)
  .component('adminTeam', adminTeam)
  .component('adminTeamEdit', adminTeamEdit)
  .component('adminTeamAccess', adminTeamAccess)
  .component('adminTeamDelete', adminTeamDelete);