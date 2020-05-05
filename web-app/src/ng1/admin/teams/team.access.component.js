import _ from 'underscore';

class AdminTeamAccessController {
  constructor($state, $stateParams, $q, $filter, Team, TeamAccess, UserService, UserPagingService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$q = $q;
    this.$filter = $filter;
    this.Team = Team;
    this.TeamAccess = TeamAccess;
    this.UserService = UserService;
    this.UserPagingService = UserPagingService;

    this.team = null;
    this.aclMembers = [];

    this.nonMember = {
      role: 'GUEST'
    };

    //This is the list of users returned from a search
    this.nonMemberSearchResults = [];
    this.isSearching = false;

    this.userState = 'all';
    this.nonAclUserState = this.userState + '.nonacl';
    this.memberSearch = '';
    
    this.stateAndData = this.UserPagingService.constructDefault();

    this.owners = [];
  }

  $onInit() {
    this.$q.all({ team: this.Team.get({ id: this.$stateParams.teamId, populate: false }).$promise }).then(result => {
      this.team = result.team;

      let clone = JSON.parse(JSON.stringify(this.stateAndData[this.userState]));
      this.stateAndData[this.nonAclUserState] = clone;

      let aclIds = Object.keys(this.team.acl);
      let allIds = aclIds.concat(this.team.userIds);

      this.stateAndData[this.userState].userFilter.in = { userIds: Object.keys(this.team.acl) };
      this.stateAndData[this.userState].countFilter.in = { userIds: Object.keys(this.team.acl) };
      
      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.refreshMembers(this.team);
      });
    });
  }

  refreshMembers(team) {
    this.team = team;

    this.aclMembers = _.map(this.team.acl, (access, userId) => {
      var member = _.pick(this.UserPagingService.users(this.stateAndData[this.userState]).find(user => user.id == userId), 'displayName', 'avatarUrl', 'lastUpdated');
      member.id = userId;
      member.role = access.role;
      return member;
    });

    this.owners = _.filter(this.aclMembers, member => {
      return member.role === 'OWNER';
    });
  }

  count() {
    return this.UserPagingService.count(this.stateAndData[this.userState]);
  }

  hasNext() {
    return this.UserPagingService.hasNext(this.stateAndData[this.userState]);
  }

  next() {
    this.UserPagingService.next(this.stateAndData[this.stateAndData[this.userState]]).then(() => {
      this.refreshMembers(this.team);
    });
  }

  hasPrevious() {
    return this.UserPagingService.hasPrevious(this.stateAndData[this.userState]);
  }

  previous() {
    this.UserPagingService.previous(this.stateAndData[this.userState]).then(() => {
      this.refreshMembers(this.team);
    });
  }

  search() {
    this.UserPagingService.search(this.stateAndData[this.userState], this.memberSearch).then(() => {
      this.refreshMembers(this.team);
    });
  }

  searchNonMembers(searchString) {
    this.isSearching = true;
    return this.UserPagingService.search(this.stateAndData[this.nonAclUserState], searchString).then(users => {
      this.nonMemberSearchResults = users;
      this.isSearching = false;
      return this.nonMemberSearchResults;
    });
  }

  addMember(member, role) {
    this.TeamAccess.update({
      teamId: this.team.id,
      userId: member.id,
      role: role
    }, team => {
      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.refreshMembers(team);
      });
    });
  }

  removeMember(member) {
    this.TeamAccess.delete({
      teamId: this.team.id,
      userId: member.id
    }, team => {
      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.refreshMembers(team);
      });
    });
  }

  updateRole(member, role) {
    this.TeamAccess.update({
      teamId: this.team.id,
      userId: member.id,
      role: role
    }, team => {
      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.refreshMembers(team);
      });
    });
  }

  gotoUser(member) {
    this.$state.go('admin.users' + { userId: member.id });
  }
}

AdminTeamAccessController.$inject = ['$state', '$stateParams', '$q', '$filter', 'Team', 'TeamAccess', 'UserService', 'UserPagingService'];

export default {
  template: require('./team.access.html'),
  controller: AdminTeamAccessController
};