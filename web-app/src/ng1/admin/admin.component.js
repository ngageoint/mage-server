import _ from 'underscore';

class AdminController {
  constructor($state, $stateParams, $transitions, UserService, DeviceService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$transitions = $transitions;
    this.UserService = UserService;
    this.DeviceService = DeviceService;

    this.inactiveUsers = {
      length: 0
    };

    this.setState();
  }

  $onInit() {
    this.currentAdminPanel = this.$stateParams.adminPanel || "";

    this.UserService.getUserCount({active: false}).then(result => {
      if(result && result.data && result.data.count) {
        this.inactiveUsers.length = result.data.count;
      }
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
    this.inactiveUsers.length = this.inactiveUsers.length - 1;
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

AdminController.$inject = ['$state', '$stateParams', '$transitions', 'UserService', 'DeviceService'];

export default {
  template: require('./admin.html'),
  controller: AdminController
};
