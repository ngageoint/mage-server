import _ from 'underscore';
import PagingHelper from '../paging'

class AdminTeamAccessController {
  constructor($state, $stateParams, $q, $filter, Team, TeamAccess, UserService) {
    this.$stateParams = $stateParams;
    this.$q = $q;
    this.$filter = $filter;
    this.Team = Team;
    this.TeamAccess = TeamAccess;
    this.UserService = UserService;

    this.team = null;
    this.aclMembers = [];

    this.nonMember = null;

     //This is the list of users returned from a search
     this.nonMemberSearchResults = [];
     this.isSearching = false;

    this.userState = 'all';
    this.usersPerPage = 10;
    this.memberSearch = '';
    this.nonMemberPaging = new PagingHelper(UserService, false);
    this.aclPagingHelper = new PagingHelper(UserService, false);

    this.owners = [];

    // For some reason angular is not calling into filter function with correct context
    this.filterMembers = this._filterMembers.bind(this);
  }

  $onInit() {
    this.$q.all({ team: this.Team.get({ id: this.$stateParams.teamId, populate: false }).$promise }).then(result => {
      this.team = result.team;

      this.aclPagingHelper.stateAndData[this.userState].userFilter.in = { userIds: Object.keys(this.team.acl) };
      this.aclPagingHelper.stateAndData[this.userState].countFilter.in = { userIds: Object.keys(this.team.acl)  };
      Promise.all(this.aclPagingHelper.refresh()).then(states => {
        this.refreshMembers(this.team);
      });

      let aclIds = Object.keys(this.team.acl);
      let allIds = aclIds.concat(this.team.userIds);

      this.nonMemberPaging.stateAndData[this.userState].userFilter.nin = { userIds: allIds };
      this.nonMemberPaging.stateAndData[this.userState].countFilter.nin = { userIds: allIds };
      this.nonMemberPaging.refresh();
    });
  }

  refreshMembers(team) {
    this.team = team;

    this.aclMembers = _.map(this.team.acl, (access, userId) => {
      var member = _.pick( this.aclPagingHelper.users(this.userState).find(user => user.id == userId), 'displayName', 'avatarUrl', 'lastUpdated');
      member.id = userId;
      member.role = access.role;
      return member;
    });

    this.owners = this.getOwners();
  }

  getOwners() {
    return _.filter(this.aclMembers, member => {
      return member.role === 'OWNER';
    });
  }

  count() {
    return this.aclPagingHelper.count(this.userState);
  }

  hasNext() {
    return this.aclPagingHelper.hasNext(this.userState);
  }

  next() {
    this.aclPagingHelper.next(this.userState).then(pageInfo => {
      this.refreshMembers(this.team);
    });
  }

  hasPrevious() {
    return this.aclPagingHelper.hasPrevious(this.userState);
  }

  previous() {
    this.aclPagingHelper.previous(this.userState).then(pageInfo => {
      this.refreshMembers(this.team);
    });
  }

  search() {
    this.aclPagingHelper.search(this.userState, this.memberSearch);
  }

  searchNonMembers(searchString) {
    this.isSearching = true;
    return this.nonMemberPaging.search(this.userState, searchString).then(result => {
      this.nonMemberSearchResults = this.nonMemberPaging.users(this.userState);
      this.isSearching = false;
      return this.nonMemberSearchResults;
    });
  }

  addMember() {
    this.TeamAccess.update({
      teamId: this.team.id,
      userId: this.nonMember.id,
      role: this.nonMember.role
    }, team => {
      Promise.all(this.aclPagingHelper.refresh()).then(states => {
        Promise.all(this.nonMemberPaging.refresh()).then(states=> {
          this.refreshMembers(team);
        })
      });
    });
  }

  removeMember(member) {
    this.TeamAccess.delete({
      teamId: this.team.id,
      userId: member.id
    }, team => {
      Promise.all(this.aclPagingHelper.refresh()).then(states => {
        Promise.all(this.nonMemberPaging.refresh()).then(states=> {
          this.refreshMembers(team);
        })
      });
    });
  }

  updateRole(member, role) {
    this.TeamAccess.update({
      teamId: this.team.id,
      userId: member.id,
      role: role
    }, team => {
      Promise.all(this.aclPagingHelper.refresh()).then(states => {
        Promise.all(this.nonMemberPaging.refresh()).then(states=> {
          this.refreshMembers(team);
        })
      });
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