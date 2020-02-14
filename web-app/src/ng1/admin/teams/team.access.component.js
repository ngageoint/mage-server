import _ from 'underscore';

class AdminTeamAccessController {
  constructor($state, $stateParams, $q, $filter, Team, TeamAccess, UserService) {
    this.$stateParams = $stateParams;
    this.$q = $q;
    this.$filter = $filter;
    this.Team = Team;
    this.TeamAccess = TeamAccess;
    this.UserService = UserService;

    this.users = [];
    this.member = {
      role: 'GUEST'
    };

    // For some reason angular is not calling into filter function with correct context
    this.filterMembers = this._filterMembers.bind(this);
  }

  $onInit() {
    this.$q.all({users: this.UserService.getAllUsers(), team: this.Team.get({id: this.$stateParams.teamId, populate: false}).$promise}).then(result => {
      this.users = result.users;
  
      this.refreshMembers(result.team);
    });
  }

  refreshMembers(team) {
    this.team = team;

    var usersById = _.indexBy(this.users, 'id');

    this.teamMembers = _.map(this.team.acl, (access, userId) => {
      var member = _.pick(usersById[userId], 'displayName', 'avatarUrl', 'lastUpdated');
      member.id = userId;
      member.role = access.role;
      return member;
    });

    this.nonMembers = _.reject(this.users, user => {
      return _.where(this.teamMembers, {id: user.id}).length > 0;
    });

    this.owners = this.getOwners();
  }

  getOwners() {
    return _.filter(this.teamMembers, member => {
      return member.role === 'OWNER';
    });
  }

  addMember(member, role) {
    this.TeamAccess.update({
      teamId: this.team.id,
      userId: member.id,
      role: role
    }, team => {
      delete this.member.selected;
      this.refreshMembers(team);
    });
  }

  removeMember(member) {
    this.TeamAccess.delete({
      teamId: this.team.id,
      userId: member.id
    }, team => {
      this.refreshMembers(team);
    });
  }

  updateRole(member, role) {
    this.TeamAccess.update({
      teamId: this.team.id,
      userId: member.id,
      role: role
    }, team => {
      this.refreshMembers(team);
    });
  }

  gotoUser(member) {
    this.$state.go('admin.users' + { userId: member.id });
  }

  _filterMembers(member) {
    var filteredMembers = this.$filter('filter')([member], this.memberSearch);
    return filteredMembers && filteredMembers.length;
  }
}

AdminTeamAccessController.$inject = ['$state', '$stateParams', '$q', '$filter', 'Team', 'TeamAccess', 'UserService'];

export default {
  template: require('./team.access.html'),
  controller: AdminTeamAccessController
};