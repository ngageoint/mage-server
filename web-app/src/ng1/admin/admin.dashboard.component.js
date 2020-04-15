import _ from 'underscore';
import moment from 'moment';

class AdminDashboardController {
  constructor($state, $filter, UserService, DeviceService, LoginService, Team, Event, Layer) {
    this.$state = $state;
    this._$filter = $filter;
    this._UserService = UserService;
    this._DeviceService = DeviceService;
    this._LoginService = LoginService;
    this._Team = Team;
    this._Event = Event;
    this._Layer = Layer;
    this.usersPerPage = 10;
    this.userSearch = '';
    this.previousSearch = '';

    this.stateAndData = new Map();
    this.stateAndData['inactive'] = {
      countFilter: {active: false},
      userFilter: {active: false, limit: this.usersPerPage, sort: {displayName: 1, _id: 1}},
      userCount: 0,
      pageInfo: {}
    };

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

    for (const [key, value] of Object.entries(this.stateAndData)) {

      this._UserService.getUserCount(value.countFilter).then(result => {
        if(result && result.data && result.data.count) {
          this.stateAndData[key].userCount = result.data.count;
        }
      });

      this._UserService.getAllUsers(value.userFilter).then(pageInfo => {
        this.stateAndData[key].pageInfo = pageInfo;
      });
    }

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

    this._LoginService.query({limit: this.loginResultsLimit}).success(loginPage => {
      this.loginPage = loginPage;
      if (loginPage.logins.length) {
        this.firstLogin = loginPage.logins[0];
      }
    });
  }

  count(state) {
    return this.stateAndData[state].userCount;
  }

  hasNext(state) {
    var status = false;

    if(this.stateAndData[state].pageInfo && this.stateAndData[state].pageInfo.links) {
      status = this.stateAndData[state].pageInfo.links.next != null && 
      this.stateAndData[state].pageInfo.links.next !== "";
    }

    return status;
  }

  next(state) {
    this.move(this.stateAndData[state].pageInfo.links.next, state);
  }

  hasPrevious(state) {
    var status = false;

    if(this.stateAndData[state].pageInfo && this.stateAndData[state].pageInfo.links) {
      status = this.stateAndData[state].pageInfo.links.prev != null && 
      this.stateAndData[state].pageInfo.links.prev !== "";
    }

    return status;
  }

  previous(state) {
    this.move(this.stateAndData[state].pageInfo.links.prev, state);
  }

  move(start, state) {
    var filter = this.stateAndData[state].userFilter;
    filter.start = start;
    this._UserService.getAllUsers(filter).then(pageInfo => {
      this.stateAndData[state].pageInfo = pageInfo;
    });
  }

  users(state) {

    if (this.stateAndData[state].pageInfo.users.length == this.count(state)) { 
      //Search may or may not be occuring, but the dataset is so small,
      //we will just do client side filtering
    } else if(this.previousSearch == '' && this.userSearch == '') {
      //Not performing a seach
    } else if(this.previousSearch != '' && this.userSearch == '') {
      //Clearing out the search
      this.previousSearch = '';
      delete this.stateAndData[state].userFilter['or'];

      this.UserService.getAllUsers(this.stateAndData[state].userFilter).then(pageInfo => {
        this.stateAndData[state].pageInfo = pageInfo;
      });
    } else if (this.previousSearch == this.userSearch) {
      //Search is being performed, no need to keep searching the same info over and over
    } else {
      //Perform the server side searching
      this.previousSearch = this.userSearch;

      var filter = this.stateAndData[state].userFilter;
      filter.or = {
        displayName: '.*' + this.userSearch + '.*',
        email: '.*' + this.userSearch + '.*'
      };
      this.UserService.getAllUsers(filter).then(pageInfo => {
        this.stateAndData[state].pageInfo = pageInfo;
      });
    }

    return this.stateAndData[state].pageInfo.users;
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
      var users = this.stateAndData['inactive'].pageInfo.users;
      this.stateAndData['inactive'].pageInfo.users = _.reject(users, function(u) { return u.id === data.id; });
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
      this.unregisteredDevices = _.reject(this.unregisteredDevices, function(d) { return d.id === device.id; });
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
    this._LoginService.query({url: url, filter: this.filter, limit: this.loginResultsLimit}).success(loginPage => {

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

    this._LoginService.query({filter: this.filter, limit: this.loginResultsLimit}).success(loginPage => {
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

AdminDashboardController.$inject = ['$state', '$filter', 'UserService', 'DeviceService', 'LoginService', 'Team', 'Event', 'Layer'];

export default {
  template: require('./admin.dashboard.html'),
  bindings: {
    onUserActivated: '&',
    onDeviceEnabled: '&'
  },
  controller: AdminDashboardController,
};
