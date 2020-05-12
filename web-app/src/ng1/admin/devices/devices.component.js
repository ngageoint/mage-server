import _ from 'underscore';

class AdminDevicesController {
  constructor($uibModal, $filter, $state, LocalStorageService, DeviceService, UserService, DevicePagingService) {
    this.$uibModal = $uibModal;
    this.$filter = $filter;
    this.$state = $state;
    this.DeviceService = DeviceService;
    this.UserService = UserService;
    this.DevicePagingService = DevicePagingService;

    this.token = LocalStorageService.getToken();

    this.filter = "all"; // possible values all, registered, unregistered
    this.devices = [];

    this.stateAndData = this.DevicePagingService.constructDefault();

    this.hasDeviceCreatePermission = _.contains(UserService.myself.role.permissions, 'CREATE_DEVICE');
    this.hasDeviceEditPermission = _.contains(UserService.myself.role.permissions, 'UPDATE_DEVICE');
    this.hasDeviceDeletePermission = _.contains(UserService.myself.role.permissions, 'DELETE_DEVICE');

    // For some reason angular is not calling into filter function with correct context
    this.filterRegistered = this._filterRegistered.bind(this);
  }

  $onInit() {
    this.DevicePagingService.refresh(this.stateAndData).then(() => {
      this.devices = this.DevicePagingService.devices(this.stateAndData[this.filter]);
    });
  }

  count(state) {
    return this.stateAndData[state].deviceCount;
  }

  hasNext() {
    return this.DevicePagingService.hasNext(this.stateAndData[this.filter]);
  }

  next() {
    this.DevicePagingService.next(this.stateAndData[this.filter]).then(devices => {
      this.devices = devices;
    });
  }

  hasPrevious() {
    return this.DevicePagingService.hasPrevious(this.stateAndData[this.filter]);
  }

  previous() {
    this.DevicePagingService.previous(this.stateAndData[this.filter]).then(devices => {
      this.devices = devices;
    });
  }

  search() {
    this.DevicePagingService.search(this.stateAndData[this.filter], this.deviceSearch).then(devices => {
      this.devices = devices;
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
    } else if (userAgent.toLowerCase().indexOf("ios") !== -1) {
      device.iconClass = 'fa-apple admin-apple-icon';
    } else {
      device.iconClass = 'fa-mobile admin-generic-icon';
    }

    return device.iconClass;
  }

  reset() {
    this.filter = 'all';
    this.deviceSearch = '';
    this.search();
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
      this.DevicePagingService.refresh(this.stateAndData).then(() => {
        this.devices = this.DevicePagingService.devices(this.stateAndData[this.filter]);
      });
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

    modalInstance.result.then(() => {
      this.DevicePagingService.refresh(this.stateAndData).then(() => {
        this.devices = this.DevicePagingService.devices(this.stateAndData[this.filter]);
      });
    });
  }
}

AdminDevicesController.$inject = ['$uibModal', '$filter', '$state', 'LocalStorageService', 'DeviceService', 'UserService', 'DevicePagingService'];

export default {
  template: require('./devices.html'),
  bindings: {
    onDeviceRegistered: '&'
  },
  controller: AdminDevicesController
};