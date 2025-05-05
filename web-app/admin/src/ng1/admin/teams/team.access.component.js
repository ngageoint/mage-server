"use strict";

import _ from 'underscore';

class AdminTeamAccessController {
  constructor($state, $stateParams, $q, $filter, Team, TeamAccess, UserPagingService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$q = $q;
    this.$filter = $filter;
    this.Team = Team;
    this.TeamAccess = TeamAccess;
    this.UserPagingService = UserPagingService;

    this.team = null;
    this.teamMembers = [];

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

    // For some reason angular is not calling into filter function with correct context
    this.filterMembers = this._filterMembers.bind(this);
  }

  $onInit() {
    this.$q.all({ team: this.Team.get({ id: this.$stateParams.teamId, populate: false }).$promise }).then(result => {
      this.team = result.team;

      let clone = JSON.parse(JSON.stringify(this.stateAndData[this.userState]));
      this.stateAndData[this.nonAclUserState] = clone;

      this.stateAndData[this.userState].userFilter.in = { _id: Object.keys(this.team.acl) };
      this.stateAndData[this.userState].countFilter.in = { _id: Object.keys(this.team.acl) };

      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.refreshMembers(this.team);
      });
    });
  }

  refreshMembers(team) {
    this.team = team;

    const usersById = _.indexBy(this.UserPagingService.users(this.stateAndData[this.userState]), 'id');

    this.teamMembers = _.map(this.team.acl, (access, userId) => {
      let member = _.pick(usersById[userId], 'displayName', 'avatarUrl', 'lastUpdated');
      member.id = userId;
      member.role = access.role;
      return member;
    });

    this.owners = this.getOwners();
  }

  getOwners() {
    return _.filter(this.teamMembers, member => {
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

    if (searchString == null) {
      searchString = '.*';
    }

    return this.UserPagingService.search(this.stateAndData[this.nonAclUserState], searchString).then(users => {
      this.nonMemberSearchResults = users;

      if (this.nonMemberSearchResults.length == 0) {
        const noUser = {
          displayName: "No Results Found"
        };
        this.nonMemberSearchResults.push(noUser);
      }

      this.isSearching = false;
      return this.nonMemberSearchResults;
    });
  }

  addMember() {
    this.TeamAccess.update({
      teamId: this.team.id,
      userId: this.nonMember.selected.id,
      role: this.nonMember.role
    }, team => {
      delete this.nonMember.selected;

      this.stateAndData[this.userState].userFilter.in = { _id: Object.keys(team.acl) };
      this.stateAndData[this.userState].countFilter.in = { _id: Object.keys(team.acl) };

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

      this.stateAndData[this.userState].userFilter.in = { _id: Object.keys(team.acl) };
      this.stateAndData[this.userState].countFilter.in = { _id: Object.keys(team.acl) };

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
    this.$state.go('admin.user', { userId: member.id });
  }

  _filterMembers(member) {
    var filteredMembers = this.$filter('filter')([member], this.memberSearch);
    return filteredMembers && filteredMembers.length;
  }
}

AdminTeamAccessController.$inject = ['$state', '$stateParams', '$q', '$filter', 'Team', 'TeamAccess', 'UserPagingService'];

export default {
  template: require('./team.access.html'),
  controller: AdminTeamAccessController
};