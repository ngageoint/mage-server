"use strict";

import _ from 'underscore';
import moment from 'moment';

class AdminUserController {
  constructor($uibModal, $state, $stateParams, $q, LocalStorageService, UserService, LoginService, DevicePagingService, Team, TeamPagingService) {
    this.$q = $q;
    this.$state = $state;
    this.$uibModal = $uibModal;
    this.$stateParams = $stateParams;
    this.LocalStorageService = LocalStorageService;
    this.UserService = UserService;
    this.LoginService = LoginService;
    this.DevicePagingService = DevicePagingService;
    this.Team = Team;
    this.TeamPagingService = TeamPagingService;

    this.userTeams = [];
    this.team = {};

    this.hasUserEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_USER');
    this.hasUserDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_USER');

    this.filter = {
      user: {id: $stateParams.userId}
    };

    this.login = {
      startDateOpened: false,
      endDateOpened: false
    };
    this.firstLogin = null;
    this.showPrevious = false;
    this.showNext = true;

    this.deviceStateAndData = this.DevicePagingService.constructDefault();
    this.deviceState = 'all';
    this.loginSearchResults = [];
    this.isSearchingDevices = false;
    this.device = null;

    this.userTeamStateAndData = this.TeamPagingService.constructDefault();
    this.userTeamState = 'all';
    this.userTeamSearch = '';
    this.nonUserTeamSearchState = this.userTeamState + '.search';
    this.nonUserTeamSearch = '';


    this.nonUserTeam = null;
    this.nonUserTeamSearchResults = [];
    this.isSearching = false;
  }

  $onInit() {
    this.UserService.getUser(this.$stateParams.userId).then(user => {
      this.user = user;  
      const searchClone = JSON.parse(JSON.stringify(this.userTeamStateAndData[this.userTeamState]));
      this.userTeamStateAndData[this.nonUserTeamSearchState] = searchClone;

      this.userTeamStateAndData[this.userTeamState].teamFilter.in = { userIds: [user.id]};
      this.userTeamStateAndData[this.nonUserTeamSearchState].teamFilter.nin = { userIds: [user.id]};
      delete this.userTeamStateAndData[this.userTeamState].teamFilter.e;
      delete this.userTeamStateAndData[this.nonUserTeamSearchState].teamFilter.e;

      this.TeamPagingService.refresh(this.userTeamStateAndData).then(() => {
        this.userTeams = this.TeamPagingService.teams(this.userTeamStateAndData[this.userTeamState]);
      });
    });

    this.LoginService.query({filter: this.filter, limit: this.loginResultsLimit}).success(loginPage => {
      this.loginPage = loginPage;
      if (loginPage.logins.length) {
        this.firstLogin = loginPage.logins[0];
      }
    });

    delete this.deviceStateAndData['registered'];
    delete this.deviceStateAndData['unregistered'];

    this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.devices = this.DevicePagingService.devices(this.deviceStateAndData[this.deviceState]);
    });
  }

  hasNextUserTeam() {
    return this.TeamPagingService.hasNext(this.userTeamStateAndData[this.userTeamState]);
  }

  nextUserTeam() {
    this.TeamPagingService.next(this.userTeamStateAndData[this.userTeamState]).then(teams => {
      this.userTeams = teams;
    });
  }

  hasPreviousUserTeam() {
    return this.TeamPagingService.hasPrevious(this.userTeamStateAndData[this.userTeamState]);
  }

  previousUserTeam() {
    this.TeamPagingService.previous(this.userTeamStateAndData[this.userTeamState]).then(teams => {
      this.userTeams = teams;
    });
  }

  searchUserTeam() {
    this.TeamPagingService.search(this.userTeamStateAndData[this.userTeamState], this.userTeamSearch, true).then(teams => {
      this.userTeams = teams;
    });
  }


  searchNonUserTeams(searchString) {
    this.isSearching = true;

    if (searchString == null) {
      searchString = '.*';
    }

    return this.TeamPagingService.search(this.userTeamStateAndData[this.nonUserTeamSearchState], searchString, true).then(teams => {
      this.nonUserTeamSearchResults = teams;

      if(this.nonUserTeamSearchResults.length == 0) {
        const noTeam = {
          name: "No Results Found"
        };
        this.nonUserTeamSearchResults.push(noTeam);
      }

      this.isSearching = false;
  
      return this.nonUserTeamSearchResults;
    });
  }

  iconClass(device) {
    if (!device) return;

    if (device.iconClass) return device.iconClass;

    const userAgent = device.userAgent || "";

    if (device.appVersion === 'Web Client') {
      device.iconClass = 'fa-desktop admin-desktop-icon-xs';
    } else if (userAgent.toLowerCase().indexOf("android") !== -1) {
      device.iconClass = 'fa-android admin-android-icon-xs';
    } else if(userAgent.toLowerCase().indexOf("ios") !== -1) {
      device.iconClass = 'fa-apple admin-apple-icon-xs';
    } else {
      device.iconClass = 'fa-mobile admin-generic-icon-xs';
    }

    return device.iconClass;
  }

  editUser(user) {
    this.$state.go('admin.editUser', { userId: user.id });
  }

  addUserToTeam() {
    this.Team.addUser({id: this.nonUserTeam.id}, this.user, team => {
      this.userTeams.push(team);
      this.nonUserTeam = null;
    });
  }

  removeUserFromTeam($event, team) {
    $event.stopPropagation();

    this.Team.removeUser({id: team.id, userId: this.user.id}, team => {
      this.userTeams = _.reject(this.userTeams, t => { return t.id === team.id; });
    });
  }

  deleteUser(user) {
    const modalInstance = this.$uibModal.open({
      resolve: {
        user: () => {
          return user;
        }
      },
      component: "adminUserDelete"
    });

    modalInstance.result.then(() => {
      this.$state.go('admin.users');
    });
  }

  activateUser(user) {
    user.active = true;
    this.UserService.updateUser(user.id, user, () => {
      this.onUserActivated({
        $event: {
          user: user
        }
      });
    });
  }

  enableUser(user) {
    user.enabled = true;
    this.UserService.updateUser(user.id, user, () => {});
  }

  disableUser(user) {
    user.enabled = false;
    this.UserService.updateUser(user.id, user, () => {});
  }

  gotoTeam(team) {
    if (team.teamEventId) {
      this.$state.go('admin.event', { eventId: team.teamEventId });
    } else {
      this.$state.go('admin.team', { teamId: team.id });
    }
  }

  gotoDevice(device) {
    this.$state.go('admin.device', { deviceId: device.id });
  }

  pageLogin(url) {
    this.LoginService.query({url: url, filter: this.filter, limit: this.loginResultsLimit}).success(loginPage => {
      if (loginPage.logins.length) {
        this.loginPage = loginPage;
        this.showNext = loginPage.logins.length !== 0;
        this.showPrevious = loginPage.logins[0].id !== this.firstLogin.id;
      }
    });
  }

  searchLogins(searchString) {
    this.isSearchingDevices = true;

    if (searchString == null) {
      searchString = '.*';
    }

    return this.DevicePagingService.search(this.deviceStateAndData[this.deviceState], searchString).then(devices => {
      this.loginSearchResults = devices;
      this.isSearchingDevices = false;

      if(this.loginSearchResults.length == 0){
        const noDevice = {
          userAgent: "No Results Found"
        };
        this.loginSearchResults.push(noDevice);
      }
  
      return this.loginSearchResults;
    });
  }

  filterLogins() {
    this.filter.device = this.device;
    this.filter.startDate = this.login.startDate;
    if (this.login.endDate) {
      this.endDate = moment(this.login.endDate).endOf('day').toDate();
    }

    this.LoginService.query({filter: this.filter, limit: this.loginResultsLimit}).success(loginPage => {
      this.showNext = loginPage.logins.length !== 0;
      this.showPrevious = false;
      this.loginPage = loginPage;
    });
  }

  openLoginStart($event) {
    $event.preventDefault();
    $event.stopPropagation();

    this.login.startDateOpened = true;
  }

  openLoginEnd($event) {
    $event.preventDefault();
    $event.stopPropagation();

    this.login.endDateOpened = true;
  }

  loginResultsLimitChanged() {
    this.filterLogins();
  }

  dateFilterChanged() {
    this.filterLogins();
  }
}

AdminUserController.$inject = ['$uibModal', '$state', '$stateParams', '$q', 'LocalStorageService', 'UserService', 'LoginService', 'DevicePagingService', 'Team', 'TeamPagingService'];

export default {
  template: require('./user.html'),
  bindings: {
    onUserActivated: '&'
  },
  controller: AdminUserController
};