import _ from 'underscore';

class AdminTeamController {
  constructor($uibModal, $filter, $state, $stateParams, Team, Event, UserService, UserPagingService) {
    this.$uibModal = $uibModal;
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$filter = $filter;
    this.Team = Team;
    this.Event = Event;
    this.UserService = UserService;
    this.userState = 'all';
    this.userSearchState = this.userState + '.search';

    this.memberSearch = '';
    this.nonMemberSearch = '';

    this.permissions = [];
    this.members = [];

    //This is a user not in the team, that is populated 
    //when a search is performed and a user is selected
    this.nonMember = null;

    //This is the list of users returned from a search
    this.nonMemberSearchResults = [];
    this.isSearching = false;

    this.userPaging = UserPagingService;
    
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

      let searchClone = JSON.parse(JSON.stringify(this.userPaging.stateAndData[this.userState]));
      this.userPaging.stateAndData[this.userSearchState] = searchClone;

      this.userPaging.stateAndData[this.userState].userFilter.in = {userIds: this.team.userIds};
      this.userPaging.stateAndData[this.userState].countFilter.in = {userIds: this.team.userIds};
      this.userPaging.stateAndData[this.userSearchState].userFilter.nin = {userIds: this.team.userIds};
      this.userPaging.stateAndData[this.userSearchState].countFilter.nin = {userIds: this.team.userIds};
      this.userPaging.refresh().then(() => {
        this.members = this.userPaging.users(this.userState);
      });

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
    return this.userPaging.count(this.userState);
  }

  hasNext() {
    return this.userPaging.hasNext(this.userState);
  }

  next() {
    this.userPaging.next(this.userState).then(() => {
      this.members = this.userPaging.users(this.userState);
    });
  }

  hasPrevious() {
    return this.userPaging.hasPrevious(this.userState);
  }

  previous() {
    this.userPaging.previous(this.userState).then(() => {
      this.members = this.userPaging.users(this.userState);
    });
  }

  search() {
    this.userPaging.search(this.userState, this.memberSearch).then(() => {
      this.members = this.userPaging.users(this.userState);
    });
  }

  searchNonMembers(searchString) {
    this.isSearching = true;

    return this.userPaging.search(this.userSearchState, searchString).then(() => {
      this.nonMemberSearchResults = this.userPaging.users(this.userSearchState);
      this.isSearching = false;
  
      this.userPaging.refresh();

      return this.nonMemberSearchResults;
    });
  }

  editTeam(team) {
    this.$state.go('admin.editTeam', { teamId: team.id });
  }

  addUser() {
    this.team.userIds.push(this.nonMember.id);
    this.nonMember = null;

    this.saveTeam();
  }

  removeUser(user) {
    this.team.userIds = _.reject(this.team.userIds, u => { return user.id === u; });

    this.saveTeam();
  }

  _filterEvents(event) {
    var filteredEvents = this.$filter('filter')([event], this.eventSearch);
    return filteredEvents && filteredEvents.length;
  }

  saveTeam() {
    this.team.$save();

    this.userPaging.refresh().then(() => {
      this.members = this.userPaging.users(this.userState);
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
}

AdminTeamController.$inject = ['$uibModal', '$filter', '$state', '$stateParams', 'Team', 'Event', 'UserService', 'UserPagingService', 'UserPagingService'];

export default {
  template: require('./team.html'),
  controller: AdminTeamController
};
