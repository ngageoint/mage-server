import _ from 'underscore';
import moment from 'moment';

class AdminDashboardController {
  constructor($state, $filter, $scope, UserService, DeviceService, LoginService, Team, Event, Layer, UserPagingService) {
    this.$state = $state;
    this._$filter = $filter;
    this.$scope = $scope;
    this._UserService = UserService;
    this._DeviceService = DeviceService;
    this._LoginService = LoginService;
    this._Team = Team;
    this._Event = Event;
    this._Layer = Layer;
    this.usersPerPage = 10;
    this.userSearch = '';
    this.userState = 'inactive';
    this.inactiveUsersPaging = UserPagingService;
    this.inactiveUsers = [];

    // For some reason angular is not calling into filter function with correct context
    this.filterDevices = this._filterDevices.bind(this);
  }

  $onInit() {
    this.filter = {};
    this.user = {};
    this.device = {};
    this.login = {
      startDateOpened: false,
      endDateOpened: false
    };

    this.firstLogin = null;
    this.showPrevious = false;
    this.showNext = true;

    this.devicesPerPage = 10;
    this.devicesPage = 0;
    this.unregisteredDevices = [];

    this._DeviceService.getAllDevices().then(devices => {
      this.devices = devices;
      this.unregisteredDevices = _.filter(devices, device => {
        return !device.registered;
      });
    });

    this._Team.query(teams => {
      this.teamCount = _.reject(teams, team => { return team.teamEventId; }).length;
    });

    this._Event.count(data => {
      this.eventCount = data.count;
    });

    this._Layer.count(data => {
      this.layerCount = data.count;
    });

    this._LoginService.query({ limit: this.loginResultsLimit }).success(loginPage => {
      this.loginPage = loginPage;
      if (loginPage.logins.length) {
        this.firstLogin = loginPage.logins[0];
      }
    });

    this.inactiveUsersPaging.refresh().then(() => {
      this.setUsers();
    });
  }

  setUsers() {
    this.inactiveUsers = this.inactiveUsersPaging.users(this.userState);
    this.$scope.$apply();
  }

  count() {
    return this.inactiveUsersPaging.count(this.userState);
  }

  hasNext() {
    return this.inactiveUsersPaging.hasNext(this.userState);
  }

  next() {
    this.inactiveUsersPaging.next(this.userState).then(() => {
      this.setUsers();
    });
  }

  hasPrevious() {
    return this.inactiveUsersPaging.hasPrevious(this.userState);
  }

  previous() {
    this.inactiveUsersPaging.previous(this.userState).then(() => {
      this.setUsers();
    });
  }

  search() {
    this.inactiveUsersPaging.search(this.userState, this.userSearch).then(() => {
      this.setUsers();
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
    } else if (userAgent.toLowerCase().indexOf("ios") !== -1) {
      device.iconClass = 'fa-apple admin-apple-icon-xs';
    } else {
      device.iconClass = 'fa-mobile admin-generic-icon-xs';
    }

    return device.iconClass;
  }

  gotoUser(user) {
    this.$state.go('admin.user', { userId: user.id });
  }

  gotoDevice(device) {
    this.$state.go('admin.device', { deviceId: device.id });
  }

  hasPermission(permission) {
    return _.contains(this._UserService.myself.role.permissions, permission);
  }

  activateUser($event, user) {
    $event.stopPropagation();

    user.active = true;

    this._UserService.updateUser(user.id, user, data => {
      this.inactiveUsersPaging.refresh().then(() => {
        this.setUsers();
      });
      this.onUserActivated({
        $event: {
          user: user
        }
      });
    });
  }

  registerDevice($event, device) {
    $event.stopPropagation();

    device.registered = true;
    this._DeviceService.updateDevice(device).then(device => {
      this.unregisteredDevices = _.reject(this.unregisteredDevices, function (d) { return d.id === device.id; });
      this.onDeviceEnabled({
        $event: {
          user: device
        }
      });
    });
  }

  _filterDevices(device) {
    var filteredDevices = this._$filter('filter')([device], this.deviceSearch);
    return filteredDevices && filteredDevices.length;
  }

  pageLogin(url) {
    this._LoginService.query({ url: url, filter: this.filter, limit: this.loginResultsLimit }).success(loginPage => {

      if (loginPage.logins.length) {
        this.loginPage = loginPage;
        this.showNext = loginPage.logins.length !== 0;
        this.showPrevious = loginPage.logins[0].id !== this.firstLogin.id;
      }
    });
  }

  filterLogins() {
    this.filter.user = this.user.selected;
    this.filter.device = this.device.selected;
    this.filter.startDate = this.login.startDate;
    if (this.login.endDate) {
      this.filter.endDate = moment(this.login.endDate).endOf('day').toDate();
    }

    this._LoginService.query({ filter: this.filter, limit: this.loginResultsLimit }).success(loginPage => {
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

  dateFilterChanged() {
    this.filterLogins();
  }

  loginResultsLimitChanged() {
    this.filterLogins();
  }
}

AdminDashboardController.$inject = ['$state', '$filter', '$scope', 'UserService', 'DeviceService', 'LoginService', 'Team', 'Event', 'Layer', 'UserPagingService'];

export default {
  template: require('./admin.dashboard.html'),
  bindings: {
    onUserActivated: '&',
    onDeviceEnabled: '&'
  },
  controller: AdminDashboardController,
};
