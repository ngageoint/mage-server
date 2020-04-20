import _ from 'underscore';
import PagingHelper from '../paging'

class AdminTeamController {
  constructor($uibModal, $filter, $state, $stateParams, Team, Event, UserService) {
    this.$uibModal = $uibModal;
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$filter = $filter;
    this.Team = Team;
    this.Event = Event;
    this.UserService = UserService;
    this.userState = 'all';
    this.usersPerPage = 10;
    this.memberSearch = '';

    this.permissions = [];

    this.pagingHelper = new PagingHelper(UserService);
    this.nonUsers = [];
    this.loadingUsers;
    this.noSearchResults;
    
    this.edit = false;

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
      this.user = {};
      this.teamUsersById = _.indexBy(this.team.users, 'id');

      let userIds = [];

      for(var i = 0; i < this.team.users.length; i++) {
        let user = this.team.users[i];
        userIds.push(user.id);
      }

      this.pagingHelper.stateAndData[this.userState].userFilter.userIds = userIds;
      this.pagingHelper.refresh();

      var myAccess = this.team.acl[this.UserService.myself.id];
      var aclPermissions = myAccess ? myAccess.permissions : [];

      this.hasReadPermission = _.contains(this.UserService.myself.role.permissions, 'READ_TEAM') || _.contains(aclPermissions, 'read');
      this.hasUpdatePermission = _.contains(this.UserService.myself.role.permissions, 'UPDATE_TEAM') || _.contains(aclPermissions, 'update');
      this.hasDeletePermission = _.contains(this.UserService.myself.role.permissions, 'DELETE_TEAM') || _.contains(aclPermissions, 'delete');
    });

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

  count() {
    return this.pagingHelper.count(this.userState);
  }

  hasNext() {
    return this.pagingHelper.hasNext(this.userState);
  }

  next() {
    this.pagingHelper.next(this.userState);
  }

  hasPrevious() {
    return this.pagingHelper.hasPrevious(this.userState);
  }

  previous() {
    this.pagingHelper.previous(this.userState);
  }

  users() {
    return this.pagingHelper.users(this.userState);
  }

  search() {
    this.pagingHelper.search(this.userState, this.memberSearch);
  }

  editTeam(team) {
    this.$state.go('admin.editTeam', { teamId: team.id });
  }

  addUser(user) {
    this.user = {};
    this.team.users.push(user);

    this.saveTeam(this.team);
  }

  removeUser(user) {
    this.team.users = _.reject(this.team.users, u => { return user.id === u.id; });

    this.saveTeam(this.team);
  }

  _filterEvents(event) {
    var filteredEvents = this.$filter('filter')([event], this.eventSearch);
    return filteredEvents && filteredEvents.length;
  }

  saveTeam() {
    this.team.$save();
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
    var modalInstance = this.$uibModal.open({
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

  getNonUsers(searchString) {
    this.loadingUsers = 'Loading Users...';

    this.nonUsers = this.pagingHelper.users(this.userState, searchString);

    this.loadingUsers = null;
    if(searchString != '') {
      this.noSearchResults = this.nonUsers.length == 0;
    } else{
      this.noSearchResults = null;
    }
    
    return this.nonUsers;
  }
}

AdminTeamController.$inject = ['$uibModal', '$filter', '$state', '$stateParams', 'Team', 'Event', 'UserService'];

export default {
  template: require('./team.html'),
  controller: AdminTeamController
};
