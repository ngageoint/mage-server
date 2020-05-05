import _ from 'underscore';

class AdminController {
  constructor($state, $stateParams, $transitions, UserPagingService, DeviceService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$transitions = $transitions;
    this.UserPagingService = UserPagingService;
    this.DeviceService = DeviceService;

    this.userState = 'inactive';
    this.inactiveUsers = [];
    this.stateAndData = this.UserPagingService.constructDefault();

    this.setState();
  }

  $onInit() {
    this.currentAdminPanel = this.$stateParams.adminPanel || "";

    this.stateAndData.delete('all');
    this.stateAndData.delete('active');
    this.stateAndData.delete('disabled');

    this.UserPagingService.refresh(this.stateAndData).then(() => {
      this.inactiveUsers = this.UserPagingService.users(this.stateAndData[this.userState]);
    });

    this.DeviceService.getAllDevices().then(devices => {
      this.devices = devices;
      this.unregisteredDevices = _.filter(devices, device => {
        return !device.registered;
      });
    });

    this.$transitions.onSuccess({}, () => {
      this.setState();
    });
  }

  setState() {
    this.state = this.$state.current.url.match(/^\/[a-zA-Z]*/)[0];
  }

  onTabChanged($event) {
    // this.$state.go($event.state);
  }

  userActivated($event) {
    this.UserPagingService.refresh(this.stateAndData).then(() => {
      this.inactiveUsers = this.UserPagingService.users(this.stateAndData[this.userState]);
    });
  }

  deviceRegistered($event) {
    this.unregisteredDevices = _.filter(this.unregisteredDevices, unregisteredDevice => {
      return unregisteredDevice.id !== $event.device.id;
    });
  }

  deviceUnregistered($event) {
    this.unregisteredDevices.push($event.device);
  }
}

AdminController.$inject = ['$state', '$stateParams', '$transitions', 'UserPagingService', 'DeviceService'];

export default {
  template: require('./admin.html'),
  controller: AdminController
};
