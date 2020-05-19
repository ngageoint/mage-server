import _ from 'underscore';

class AdminTeamsController {
  constructor($state, $uibModal, $filter, Team, UserService, TeamPagingService) {
    this.$state = $state;
    this.$uibModal = $uibModal;
    this.$filter = $filter;
    this.Team = Team;
    this.UserService = UserService;
    this.TeamPagingService = TeamPagingService;

    this.filter = 'all';
    this.teamSearch = '';
    this.teams = [];
    this.stateAndData = this.TeamPagingService.constructDefault();
  }

  $onInit() {
    this.TeamPagingService.refresh(this.stateAndData).then(() => {
      this.teams = this.TeamPagingService.teams(this.stateAndData[this.filter]);
    });
  }

  count(state) {
    return this.stateAndData[state].teamCount;
  }

  hasNext() {
    return this.TeamPagingService.hasNext(this.stateAndData[this.filter]);
  }

  next() {
    this.TeamPagingService.next(this.stateAndData[this.filter]).then(teams => {
      this.teams = teams;
    });
  }

  hasPrevious() {
    return this.TeamPagingService.hasPrevious(this.stateAndData[this.filter]);
  }

  previous() {
    this.TeamPagingService.previous(this.stateAndData[this.filter]).then(teams => {
      this.teams = teams;
    });
  }

  search() {
    this.TeamPagingService.search(this.stateAndData[this.filter], this.teamSearch).then(teams => {
      this.teams = teams;
    });
  }

  reset() {
    this.teamSearch = '';
    this.stateAndData = this.TeamPagingService.constructDefault();
    this.TeamPagingService.refresh(this.stateAndData).then(() => {
      this.teams = this.TeamPagingService.teams(this.stateAndData[this.filter]);
    });
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

AdminTeamsController.$inject = ['$state', '$uibModal', '$filter', 'Team', 'UserService', 'TeamPagingService'];

export default {
  template: require('./teams.html'),
  controller: AdminTeamsController
};