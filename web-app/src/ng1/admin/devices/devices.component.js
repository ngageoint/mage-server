import _ from 'underscore';

class AdminDevicesController {
  constructor($uibModal, $state, LocalStorageService, DeviceService, UserService, DevicePagingService, UserPagingService) {
    this.$uibModal = $uibModal;
    this.$state = $state;
    this.DeviceService = DeviceService;
    this.UserService = UserService;
    this.DevicePagingService = DevicePagingService;
    this.UserPagingService = UserPagingService;

    this.token = LocalStorageService.getToken();

    this.filter = "all"; // possible values all, registered, unregistered
    this.deviceSearch = '';
    this.devices = [];

    this.deviceStateAndData = this.DevicePagingService.constructDefault();
    this.userStateAndData = this.UserPagingService.constructDefault();

    this.hasDeviceCreatePermission = _.contains(UserService.myself.role.permissions, 'CREATE_DEVICE');
    this.hasDeviceEditPermission = _.contains(UserService.myself.role.permissions, 'UPDATE_DEVICE');
    this.hasDeviceDeletePermission = _.contains(UserService.myself.role.permissions, 'DELETE_DEVICE');
  }

  $onInit() {
    this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.devices = this.DevicePagingService.devices(this.deviceStateAndData[this.filter]);
    });

    delete this.userStateAndData['active'];
    delete this.userStateAndData['inactive'];
    delete this.userStateAndData['disabled'];
    this.UserPagingService.refresh(this.userStateAndData);
  }

  count(state) {
    return this.deviceStateAndData[state].deviceCount;
  }

  hasNext() {
    return this.DevicePagingService.hasNext(this.deviceStateAndData[this.filter]);
  }

  next() {
    this.DevicePagingService.next(this.deviceStateAndData[this.filter]).then(devices => {
      this.devices = devices;
    });
  }

  hasPrevious() {
    return this.DevicePagingService.hasPrevious(this.deviceStateAndData[this.filter]);
  }

  previous() {
    this.DevicePagingService.previous(this.deviceStateAndData[this.filter]).then(devices => {
      this.devices = devices;
    });
  }

  search() {
    this.DevicePagingService.search(this.deviceStateAndData[this.filter], this.deviceSearch).then(devices => {
      if(devices.length > 0) {
        this.devices = devices;
      } else {

        //Need to do a user search, so grab all the devices specific to the filter and not the search
        this.DevicePagingService.search(this.deviceStateAndData[this.filter], '').then(devices => {
          this.UserPagingService.search(this.userStateAndData['all'], this.deviceSearch).then(users => {
            this.devices = _.filter(devices, device => {
              return _.some(users, user => {
                if (device.user.id === user.id) return true;
              });
            });
          });
        });
        
      }
    });
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

  changeFilter(state) {
    this.filter = state;
    this.search();
  }

  reset() {
    this.filter = 'all';
    this.deviceSearch = '';
    this.deviceStateAndData = this.DevicePagingService.constructDefault();
    this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.devices = this.DevicePagingService.devices(this.deviceStateAndData[this.filter]);
    });
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
      this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
        this.devices = this.DevicePagingService.devices(this.deviceStateAndData[this.filter]);
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
      this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
        this.devices = this.DevicePagingService.devices(this.deviceStateAndData[this.filter]);
      });
    });
  }
}

AdminDevicesController.$inject = ['$uibModal', '$state', 'LocalStorageService', 'DeviceService', 'UserService', 'DevicePagingService', 'UserPagingService'];

export default {
  template: require('./devices.html'),
  bindings: {
    onDeviceRegistered: '&'
  },
  controller: AdminDevicesController
};