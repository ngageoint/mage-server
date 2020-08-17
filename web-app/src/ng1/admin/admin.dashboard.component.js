"use strict";

import _ from 'underscore';
import moment from 'moment';

class AdminDashboardController {
  constructor($state, $filter, UserService, DeviceService, DevicePagingService, LoginService, Event, Layer, UserPagingService) {
    this.$state = $state;
    this._$filter = $filter;
    this._UserService = UserService;
    this._DeviceService = DeviceService;
    this._LoginService = LoginService;
    this._Event = Event;
    this._Layer = Layer;
    this.UserPagingService = UserPagingService;
    this.DevicePagingService = DevicePagingService;

    this.userSearch = '';
    this.userState = 'inactive';
    this.inactiveUsers = [];
    this.stateAndData = this.UserPagingService.constructDefault();
    this.loginSearchResults = [];

    this.deviceStateAndData = this.DevicePagingService.constructDefault();
    this.deviceState = 'unregistered';
    this.deviceSearch = '';
    this.unregisteredDevices = [];
    this.loginDeviceSearchResults = [];
  }

  $onInit() {
    this.filter = {};
    this.user = null;
    this.device = null;
    this.login = {
      startDateOpened: false,
      endDateOpened: false
    };

    this.firstLogin = null;
    this.showPrevious = false;
    this.showNext = true;

    this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.unregisteredDevices = this.DevicePagingService.devices(this.deviceStateAndData[this.deviceState]);
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

    this.UserPagingService.refresh(this.stateAndData).then(() => {
      this.inactiveUsers = this.UserPagingService.users(this.stateAndData[this.userState]);
    });
  }

  count() {
    return this.UserPagingService.count(this.stateAndData[this.userState]);
  }

  hasNext() {
    return this.UserPagingService.hasNext(this.stateAndData[this.userState]);
  }

  next() {
    this.UserPagingService.next(this.stateAndData[this.userState]).then(users => {
      this.inactiveUsers = users;
    });
  }

  hasPrevious() {
    return this.UserPagingService.hasPrevious(this.stateAndData[this.userState]);
  }

  previous() {
    this.UserPagingService.previous(this.stateAndData[this.userState]).then(users => {
      this.inactiveUsers = users;
    });
  }

  deviceCount() {
    return this.DevicePagingService.count(this.deviceStateAndData[this.deviceState]);
  }

  hasNextDevice() {
    return this.DevicePagingService.hasNext(this.deviceStateAndData[this.deviceState]);
  }

  nextDevice() {
    this.DevicePagingService.next(this.deviceStateAndData[this.deviceState]).then(devices => {
      this.unregisteredDevices = devices;
    });
  }

  hasPreviousDevice() {
    return this.DevicePagingService.hasPrevious(this.deviceStateAndData[this.deviceState]);
  }

  previousDevice() {
    this.DevicePagingService.previous(this.deviceStateAndData[this.deviceState]).then(devices => {
      this.unregisteredDevices = devices;
    });
  }

  search() {
    this.UserPagingService.search(this.stateAndData[this.userState], this.userSearch).then(users => {
      this.inactiveUsers = users;
    });
  }

  searchDevices() {
    this.DevicePagingService.search(this.deviceStateAndData[this.deviceState], this.deviceSearch).then(devices => {
      if (devices.length > 0) {
        this.unregisteredDevices = devices;
      } else {
        this.DevicePagingService.search(this.deviceStateAndData[this.deviceState], this.deviceSearch, this.deviceSearch).then(devices => {
          this.unregisteredDevices = devices;
        });
      }
    });
  }

  searchLoginsAgainstUsers(searchString) {
    if (searchString == null) {
      searchString = '.*';
    }

    return this.UserPagingService.search(this.stateAndData['all'], searchString).then(users => {
      this.loginSearchResults = users;

      if (this.loginSearchResults.length == 0) {
        const noUser = {
          displayName: "No Results Found"
        }
        this.loginSearchResults.push(noUser);
      }

      return this.loginSearchResults;
    });
  }

  searchLoginsAgainstDevices(searchString) {
    if (searchString == null) {
      searchString = '.*';
    }
    
    return this.DevicePagingService.search(this.deviceStateAndData['all'], searchString).then(devices => {
      this.loginDeviceSearchResults = devices;

      if (this.loginDeviceSearchResults.length == 0) {
        const noDevice = {
          userAgent: "No Results Found"
        }
        this.loginDeviceSearchResults.push(noDevice);
      }

      return this.loginDeviceSearchResults;
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

    this._UserService.updateUser(user.id, user, () => {
      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.inactiveUsers = this.UserPagingService.users(this.stateAndData[this.userState]);
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
      this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
        this.unregisteredDevices = this.DevicePagingService.devices(this.deviceStateAndData[this.deviceState]);
      });
      this.onDeviceEnabled({
        $event: {
          user: device
        }
      });
    });
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
    this.filter.user = this.user;
    this.filter.device = this.device;
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

AdminDashboardController.$inject = ['$state', '$filter', 'UserService', 'DeviceService', 'DevicePagingService', 'LoginService', 'Event', 'Layer', 'UserPagingService'];

export default {
  template: require('./admin.dashboard.html'),
  bindings: {
    onUserActivated: '&',
    onDeviceEnabled: '&'
  },
  controller: AdminDashboardController,
};
