import _ from 'underscore';

class AdminDevicesController {
  constructor($uibModal, $filter, $state, LocalStorageService, DeviceService, UserService) {
    this.$uibModal = $uibModal;
    this.$filter = $filter;
    this.$state = $state;
    this.DeviceService = DeviceService;
    this.UserService = UserService;

    this.token = LocalStorageService.getToken();

    this.filter = "all"; // possible values all, registered, unregistered
    this.devices = [];
    this.page = 0;
    this.itemsPerPage = 10;
  
    this.hasDeviceCreatePermission =  _.contains(UserService.myself.role.permissions, 'CREATE_DEVICE');
    this.hasDeviceEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_DEVICE');
    this.hasDeviceDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_DEVICE');

    // For some reason angular is not calling into filter function with correct context
    this.filterDevices = this._filterDevices.bind(this);
    this.filterRegistered = this._filterRegistered.bind(this);
  }
  
  $onInit() {
    this.DeviceService.getAllDevices().then(devices => {
      this.devices = devices;
    });

    this.UserService.getAllUsers().then(users => {
      this.users = users;
    });
  }

  _filterDevices(device) {
    var filteredDevices = this.$filter('filter')([device], this.deviceSearch);
    if (filteredDevices && filteredDevices.length) return true;

    var filteredUsers = this.$filter('user')(this.users, ['displayName', 'email'], this.deviceSearch);
    return _.some(filteredUsers, filteredUser => {
      if (device.userId === filteredUser.id) return true;
    });
  }

  _filterRegistered(device) {
    switch (this.filter) {
    case 'all': return true;
    case 'registered': return device.registered;
    case 'unregistered': return !device.registered;
    }
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

  reset() {
    this.page = 0;
    this.filter = 'all';
    this.deviceSearch = '';
  }

  newDevice() {
    this.$state.go('admin.deviceCreate');
  }

  gotoDevice(device) {
    this.$state.go('admin.device', { deviceId: device.id });
  }

  editDevice($event, device) {
    $event.stopPropagation();
    this.$state.go('admin.deviceEdit', { deviceId: device.id });
  }

  registerDevice($event, device) {
    $event.stopPropagation();

    device.registered = true;
    this.DeviceService.updateDevice(device).then(() => {
      this.saved = true;
      this.onDeviceRegistered({
        $event: {
          device: device
        }
      });
    }, response => {
      this.error = response.responseText;
    });
  }

  deleteDevice($event, device) {
    $event.stopPropagation();

    var modalInstance = this.$uibModal.open({
      resolve: {
        device: () => {
          return device;
        }
      },
      component: "adminDeviceDelete"
    });

    modalInstance.result.then(device => {
      this.devices = _.reject(this.devices, function(d) { return d.id === device.id; });
    });
  }
}

AdminDevicesController.$inject = ['$uibModal', '$filter', '$state', 'LocalStorageService', 'DeviceService', 'UserService'];

export default {
  template: require('./devices.html'),
  bindings: {
    onDeviceRegistered: '&'
  },
  controller: AdminDevicesController
};