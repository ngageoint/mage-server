import _ from 'underscore';
import moment from 'moment';

class AdminUserController {
  constructor($uibModal, $state, $stateParams, $q, LocalStorageService, UserService, LoginService, DevicePagingService, Team) {
    this.$q = $q;
    this.$state = $state;
    this.$uibModal = $uibModal;
    this.$stateParams = $stateParams;
    this.LocalStorageService = LocalStorageService;
    this.UserService = UserService;
    this.LoginService = LoginService;
    this.DevicePagingService = DevicePagingService;
    this.Team = Team;

    this.userTeams = [];
    this.nonTeams = [];
    this.teamsPage = 0;
    this.teamsPerPage = 10;

    this.hasUserEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_USER');
    this.hasUserDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_USER');

    this.filter = {
      user: {id: $stateParams.userId}
    };

    this.device = {};
    this.login = {
      startDateOpened: false,
      endDateOpened: false
    };
    this.firstLogin = null;
    this.showPrevious = false;
    this.showNext = true;

    this.stateAndData = this.DevicePagingService.constructDefault();
    this.deviceState = 'all';
    this.loginSearchResults = [];
    this.isSearching = false;
    this.device = null;
  }

  $onInit() {
    this.$q.all({
      user: this.UserService.getUser(this.$stateParams.userId),
      teams: this.Team.query({populate: false}).$promise}
    ).then(result => {
      this.user = result.user;  
      this.teams = result.teams;
      this.team = {};
  
      this.userTeams = _.chain(result.teams)
        .filter(team => {
          return _.some(team.userIds, id => {
            return this.user.id === id;
          });
        })
        .value();
  
      var teams = _.chain(this.teams);
      if (!_.contains(this.UserService.myself.role.permissions, 'UPDATE_TEAM')) {
        // filter teams based on acl
        teams = teams.filter(team => {
          var permissions = team.acl[this.UserService.myself.id] ? team.acl[this.UserService.myself.id].permissions : [];
          return _.contains(permissions, 'update');
        });
      }
  
      teams = teams.reject(team => {
        return _.some(team.userIds, id => {
          return this.user.id === id;
        });
      });
  
      this.nonTeams = teams.value();
    });

    this.LoginService.query({filter: this.filter, limit: this.loginResultsLimit}).success(loginPage => {
      this.loginPage = loginPage;
      if (loginPage.logins.length) {
        this.firstLogin = loginPage.logins[0];
      }
    });

    delete this.stateAndData['registered'];
    delete this.stateAndData['unregistered'];

    this.DevicePagingService.refresh(this.stateAndData).then(() => {
      this.devices = this.DevicePagingService.devices(this.stateAndData[this.deviceState]);
    });
  }

  iconClass(device) {
    if (!device) return;

    if (device.iconClass) return device.iconClass;

    var userAgent = device.userAgent || "";

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

  addUserToTeam(team) {
    this.Team.addUser({id: team.id}, this.user, team => {
      this.userTeams.push(team);
      this.nonTeams = _.reject(this.nonTeams, t => { return t.id === team.id; });

      this.team = {};
    });
  }

  removeUserFromTeam($event, team) {
    $event.stopPropagation();

    this.Team.removeUser({id: team.id, userId: this.user.id}, team => {
      this.userTeams = _.reject(this.userTeams, t => { return t.id === team.id; });
      this.nonTeams.push(team);
    });
  }

  deleteUser(user) {
    var modalInstance = this.$uibModal.open({
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
    this.$state.go('admin.teams', { teamId: team.id });
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
    this.isSearching = true;

    return this.DevicePagingService.search(this.stateAndData['all'], searchString).then(devices => {
      this.loginSearchResults = devices;
      this.isSearching = false;
  
      return this.loginSearchResults;
    });
  }

  filterLogins() {
    this.filter.device = this.device;
    this.ilter.startDate = this.login.startDate;
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

AdminUserController.$inject = ['$uibModal', '$state', '$stateParams', '$q', 'LocalStorageService', 'UserService', 'LoginService', 'DevicePagingService', 'Team'];

export default {
  template: require('./user.html'),
  bindings: {
    onUserActivated: '&'
  },
  controller: AdminUserController
};