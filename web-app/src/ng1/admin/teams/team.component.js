import _ from 'underscore';

class AdminTeamController {
  constructor($uibModal, $filter, $state, $stateParams, Team, Event, UserService) {
    this.$uibModal = $uibModal;
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$filter = $filter;
    this.Team = Team;
    this.Event = Event;
    this.UserService = UserService;

    this.permissions = [];

    this.edit = false;
    this.usersPage = 0;
    this.usersPerPage = 10;
  
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
    this.UserService.getAllUsers().then(users => {
      this.users = users;
      this.usersIdMap = _.indexBy(users, 'id');
  
      this.Team.get({id: this.$stateParams.teamId, populate: false}, team => {
        this.team = team;
        this.user = {};
        this.teamUsersById = _.indexBy(this.team.users, 'id');
        this.nonUsers = _.filter(this.users, user => {
          return !this.teamUsersById[user.id];
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
    });
  }

  editTeam(team) {
    this.$state.go('admin.editTeam', { teamId: team.id });
  }

  addUser(user) {
    this.user = {};
    this.team.users.push(user);
    this.nonUsers = _.reject(this.nonUsers, u => { return user.id === u.id; });

    this.saveTeam(this.team);
  }

  removeUser(user) {
    this.nonUsers.push(user);
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
    this.Event.addTeam({id: event.id}, this.team, event => {
      this.teamEvents.push(event);
      this.nonTeamEvents = _.reject(this.nonTeamEvents, e => { return e.id === event.id; });

      this.event = {};
    });
  }

  removeEventFromTeam($event, event) {
    $event.stopPropagation();

    this.Event.removeTeam({id: event.id, teamId: this.team.id}, event => {
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

AdminTeamController.$inject = ['$uibModal', '$filter', '$state', '$stateParams', 'Team', 'Event', 'UserService'];

export default {
  template: require('./team.html'),
  controller: AdminTeamController
};
