import angular from 'angular';
  
class AdminDeviceEditController {
  constructor($state, $stateParams, LocalStorageService, DeviceService, UserService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.DeviceService = DeviceService;
    this.UserService = UserService;

    this.token = LocalStorageService.getToken();
  }

  $onInit() {
    if (this.$stateParams.deviceId) {
      this.DeviceService.getDevice(this.$stateParams.deviceId).then(device => {
        this.device = angular.copy(device);
      });
    } else {
      this.device = {};
    }

    this.UserService.getAllUsers().then(users => {
      this.users = users;
    });
  }

  iconClass(device) {
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

  cancel() {
    if (this.device.id) {
      this.$state.go('admin.device', { deviceId: this.device.id })
    } else {
      this.$state.go('admin.devices');
    }
  }

  saveDevice() {
    this.saving = true;
    this.error = false;

    var device = this.device;
    if (device.user.id) {
      device.userId = device.user.id;
    }

    if (device.id) {
      this.DeviceService.updateDevice(device).then(() => {
        this.$state.go('admin.device', { deviceId: device.id });
      }, response => {
        this.saving = false;
        this.error = response.responseText;
      });
    } else {
      this.DeviceService.createDevice(device).then(newDevice => {
        this.$state.go('admin.device', { deviceId: newDevice.id });
      }, response => {
        this.saving = false;
        this.error = response.responseText;
      });
    }
  }
}

AdminDeviceEditController.$inject = ['$state', '$stateParams', 'LocalStorageService', 'DeviceService', 'UserService'];

export default {
  template: require('./device.edit.html'),
  controller: AdminDeviceEditController
};

