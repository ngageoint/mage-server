"use strict";

import _ from 'underscore';

class AdminTeamController {
  constructor($uibModal, $filter, $state, $stateParams, Team, Event, UserService) {
    this.$uibModal = $uibModal;
    this.$filter = $filter;
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.Team = Team;
    this.Event = Event;
    this.UserService = UserService;

    this.permissions = [];
    this.edit = false;

    this.membersPageIndex = 0;
    this.membersPageSize = 2;
    this.membersPage = {
      items: [],
      totalCount: 0,
    }

    this.nonMembersPageIndex = 0;
    this.nonMembersPageSize = 2;
    this.nonMembersPage = {
      items: [],
      totalCount: 0,
    }

    this.teamEvents = [];
    this.nonTeamEvents = [];
    this.eventsPage = 0;
    this.eventsPerPage = 10;

    this.team = {
      users: []
    };

    // For some reason angular is not calling into filter function with correct context
    this.filterEvents = this._filterEvents.bind(this);
  }

  $onInit() {
    this.Team.get({ id: this.$stateParams.teamId, populate: false }, team => {
      this.team = team;

      const myAccess = this.team.acl[this.UserService.myself.id];
      const aclPermissions = myAccess ? myAccess.permissions : [];

      this.hasUpdatePermission = _.contains(this.UserService.myself.role.permissions, 'UPDATE_TEAM') || _.contains(aclPermissions, 'update');
      this.hasDeletePermission = _.contains(this.UserService.myself.role.permissions, 'DELETE_TEAM') || _.contains(aclPermissions, 'delete');
    });

    this.getMembersPage();
    this.getNonMembersPage();

    this.Event.query(events => {
      this.event = {};
      this.teamEvents = _.filter(events, event => {
        return _.some(event.teams, team => {
          return this.team.id === team.id;
        });
      });

      this.nonTeamEvents = _.reject(events, event => {
        return _.some(event.teams, team => {
          return this.team.id === team.id;
        });
      });
    });
  }

  getMembersPage() {
    this.Team.getMembers({
      id: this.$stateParams.teamId,
      page: this.membersPageIndex,
      page_size: this.membersPageSize,
      total: true,
      term: this.memberSearchTerm
    }, page => {
      this.membersPage = page;
    });
  }

  getNonMembersPage() {
    this.Team.getNonMembers({
      id: this.$stateParams.teamId,
      page: this.nonMembersPageIndex,
      page_size: this.nonMembersPageSize,
      total: true,
      term: this.nonMemberSearchTerm
    }, page => {
      this.nonMembersPage = page;
    });
  }

  hasNextMember() {
    return (this.membersPageIndex + 1) * this.membersPageSize < this.membersPage.totalCount
  }

  hasPreviousMember() {
    return this.membersPageIndex > 0 && this.membersPage.totalCount > 0;
  }

  nextMemberPage() {
    if (this.hasNextMember()) {
      this.membersPageIndex++;
      this.getMembersPage();
    }
  }

  previousMemberPage() {
    if (this.hasPreviousMember()) {
      this.membersPageIndex--;
      this.getMembersPage();
    }
  }

  search() {
    this.membersPageIndex = 0;
    this.getMembersPage()
  }

  hasNextNonMember() {
    return (this.nonMembersPageIndex + 1) * this.nonMembersPageSize < this.nonMembersPage.totalCount
  }

  hasPreviousNonMember() {
    return this.nonMembersPageIndex > 0 && this.nonMembersPage.totalCount > 0;
  }

  nextNonMemberPage() {
    if (this.hasNextNonMember()) {
      this.nonMembersPageIndex++;
      this.getNonMembersPage();
    }
  }

  previousNonMemberPage() {
    if (this.hasPreviousNonMember()) {
      this.nonMembersPageIndex--;
      this.getNonMembersPage();
    }
  }

  searchNonMember() {
    this.nonMembersPageIndex = 0;
    this.getNonMembersPage();
  }

  editTeam(team) {
    this.$state.go('admin.editTeam', { teamId: team.id });
  }

  addMember($event, nonMember) {
    $event.stopPropagation();

    this.team.userIds.push(nonMember.id);

    this.saveTeam();
  }

  removeMember($event, user) {
    $event.stopPropagation();
    this.team.userIds = _.reject(this.team.userIds, u => { return user.id === u; });

    this.saveTeam();
  }

  _filterEvents(event) {
    const filteredEvents = this.$filter('filter')([event], this.eventSearch);
    return filteredEvents && filteredEvents.length;
  }

  saveTeam() {
    this.team.$save(null, team => {
      this.team = team;
      this.getMembersPage();
      this.getNonMembersPage();
    });
  }

  hasPermission(permission) {
    return _.contains(this.permissions, permission);
  }

  editAccess(team) {
    this.$state.go('admin.teamAccess', { teamId: team.id });
  }

  gotoEvent(event) {
    this.$state.go('admin.event', { eventId: event.id });
  }

  gotoUser(user) {
    this.$state.go('admin.user', { userId: user.id });
  }

  addEventToTeam(event) {
    this.Event.addTeam({ id: event.id }, this.team, event => {
      this.teamEvents.push(event);
      this.nonTeamEvents = _.reject(this.nonTeamEvents, e => { return e.id === event.id; });

      this.event = {};
    });
  }

  removeEventFromTeam($event, event) {
    $event.stopPropagation();

    this.Event.removeTeam({ id: event.id, teamId: this.team.id }, event => {
      this.teamEvents = _.reject(this.teamEvents, e => { return e.id === event.id; });
      this.nonTeamEvents.push(event);
    });
  }

  deleteTeam() {
    const modalInstance = this.$uibModal.open({
      resolve: {
        team: () => {
          return this.team;
        }
      },
      component: "adminTeamDelete"
    });

    modalInstance.result.then(() => {
      this.$state.go('admin.teams');
    });
  }
}

AdminTeamController.$inject = ['$uibModal', '$filter', '$state', '$stateParams', 'Team', 'Event', 'UserService'];

export default {
  template: require('./team.html'),
  controller: AdminTeamController
};
