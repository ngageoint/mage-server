import _ from 'underscore';
import moment from 'moment';

class AdminDeviceController {
  constructor($uibModal, $state, $stateParams, LocalStorageService, DeviceService, UserService, LoginService) {
    this.$uibModal = $uibModal;
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.DeviceService = DeviceService;
    this.UserService = UserService;
    this.LoginService = LoginService;
    
    this.token = LocalStorageService.getToken();

    this.hasDeviceEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_DEVICE');
    this.hasDeviceDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_DEVICE');

    this.filter = {
      device: {id: $stateParams.deviceId}
    };

    this.user = {};
    this.login = {
      startDateOpened: false,
      endDateOpened: false
    };

    this.firstLogin = null;
    this.showPrevious = false;
    this.showNext = true;
  }

  $onInit() {
    this.DeviceService.getDevice(this.$stateParams.deviceId).then(device => {
      this.device = device;
    });

    this.UserService.getAllUsers().then(users => {
      this.users = users;
    });
  
    this.LoginService.query({filter: this.$stateParamsfilter, limit: this.loginResultsLimit}).success(loginPage => {
      this.loginPage = loginPage;
      if (loginPage.logins.length) {
        this.firstLogin = loginPage.logins[0];
      }
    });
  }

  iconClass(device) {
    if (!device) return;

    if (device.iconClass) return device.iconClass;

    var userAgent = device.userAgent || "";

    if (device.appVersion === 'Web Client') {
      device.iconClass = 'fa-desktop admin-desktop-icon';
    } else if (userAgent.toLowerCase().indexOf("android") !== -1) {
      device.iconClass = 'fa-android admin-android-icon';
    } else if(userAgent.toLowerCase().indexOf("ios") !== -1) {
      device.iconClass = 'fa-apple admin-apple-icon';
    } else {
      device.iconClass = 'fa-mobile admin-generic-icon';
    }

    return device.iconClass;
  }

  editDevice(device) {
    this.$state.go('admin.deviceEdit', { deviceId: device.id });
  }

  gotoUser(user) {
    this.$state.go('admin.user', { userId: user.id });
  }

  deleteDevice(device) {
    var modalInstance = this.$uibModal.open({
      resolve: {
        device: () => {
          return device;
        }
      },
      component: "adminDeviceDelete"
    });

    modalInstance.result.then(() => {
      this.$state.go('admin.devices');
    });
  }

  registerDevice(device) {
    device.registered = true;
    this.DeviceService.updateDevice(device).then(() => {
      this.onDeviceRegistered({
        $event: {
          device: device
        }
      });
    });
  }

  unregisterDevice(device) {
    device.registered = false;
    this.DeviceService.updateDevice(device).then(() => {
      this.onDeviceUnregistered({
        $event: {
          device: device
        }
      });
    });
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

  filterLogins() {
    this.filter.user = this.user.selected;
    this.filter.startDate = this.login.startDate;
    if (this.login.endDate) {
      this.filter.endDate = moment(this.login.endDate).endOf('day').toDate();
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

  onFilterDateChanged() {
    this.filterLogins();
  }
}

AdminDeviceController.$inject = ['$uibModal', '$state', '$stateParams', 'LocalStorageService', 'DeviceService', 'UserService', 'LoginService'];

export default {
  template: require('./device.html'),
  bindings: {
    onDeviceRegistered: '&',
    onDeviceUnregistered: '&'
  },
  controller: AdminDeviceController
};