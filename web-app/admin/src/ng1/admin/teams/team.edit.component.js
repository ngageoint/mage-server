class AdminTeamEditController {
  constructor($state, $stateParams, Team) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.Team = Team;
  }

  $onInit() {
    if (this.$stateParams.teamId) {
      this.Team.get({id: this.$stateParams.teamId}, team => {
        this.team = team;
      });
    } else {
      this.team = new this.Team();
    }
  }

  saveTeam(team) {
    this.team.$save(() => {
      this.$state.go('admin.team', { teamId: team.id });
    });
  }

  cancel() {
    if (this.team.id) {
      this.$state.go('admin.team', { teamId: this.team.id });
    } else {
      this.$state.go('admin.teams');
    }
  }
}

AdminTeamEditController.$inject = ['$state', '$stateParams', 'Team'];

export default {
  template: require('./team.edit.html'),
  controller: AdminTeamEditController
};