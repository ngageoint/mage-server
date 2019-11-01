import _ from 'underscore';

class AdminTeamsController {
  constructor($state, $uibModal, $filter, Team, UserService) {
    this.$state = $state;
    this.$uibModal = $uibModal;
    this.$filter = $filter;
    this.Team = Team;
    this.UserService = UserService;

    this.teamSearch = '';
    this.teams = [];
    this.page = 0;
    this.itemsPerPage = 10;

    // For some reason angular is not calling into filter function with correct context
    this.filterTeams = this._filterTeams.bind(this);
  }

  $onInit() {
    this.Team.query(teams => {
      this.teams = _.reject(teams, team => { return team.teamEventId; });
    });
  }

  _filterTeams(team) {
    var filteredTeams = this.$filter('filter')([team], this.teamSearch);
    return filteredTeams && filteredTeams.length;
  }

  reset() {
    this.page = 0;
    this.teamSearch = '';
  }

  newTeam() {
    this.$state.go('admin.createTeam');
  }

  gotoTeam(team) {
    this.$state.go('admin.team', { teamId: team.id });
  }

  editTeam($event, team) {
    $event.stopPropagation();
    this.$state.go('admin.editTeam', {teamId:  team.id });
  }

  hasPermission(team, permission) {
    var myAccess = team.acl[this.UserService.myself.id];
    var aclPermissions = myAccess ? myAccess.permissions : [];

    switch(permission) {
    case 'update':
      return _.contains(this.UserService.myself.role.permissions, 'UPDATE_TEAM') || _.contains(aclPermissions, 'update');
    case 'delete':
      return _.contains(this.UserService.myself.role.permissions, 'DELETE_TEAM') || _.contains(aclPermissions, 'delete');
    }
  }

  hasUpdatePermission(team) {
    return this.hasPermission(team, 'update');
  }

  hasDeletePermission(team) {
    return this.hasPermission(team, 'delete');
  }

  deleteTeam($event, team) {
    $event.stopPropagation();

    var modalInstance = this.$uibModal.open({
      resolve: {
        team: () => {
          return team;
        }
      },
      component: 'adminTeamDelete'
    });

    modalInstance.result.then(team => {
      this.teams = _.reject(this.teams, t => { return t.id === team.id; });
    });
  }
}

AdminTeamsController.$inject = ['$state', '$uibModal', '$filter', 'Team', 'UserService'];

export default {
  template: require('./teams.html'),
  controller: AdminTeamsController
};