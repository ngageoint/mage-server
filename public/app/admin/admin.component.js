import _ from 'underscore';

class AdminController {
  constructor($state, $stateParams, UserService, DeviceService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.UserService = UserService;
    this.DeviceService = DeviceService;

    this.setState();
  }

  $onInit() {
    this.currentAdminPanel = this.$stateParams.adminPanel || "";

    this.UserService.getAllUsers().then(users => {
      this.users = users.data || users;
  
      this.inactiveUsers = _.filter(this.users, user => {
        return !user.active;
      });
    });

    this.DeviceService.getAllDevices().then(devices => {
      this.devices = devices;
      this.unregisteredDevices = _.filter(devices, device => {
        return !device.registered;
      });
    });
  }

  setState() {
    this.state = this.$state.current.url.match(/^\/[a-zA-Z]*/)[0];
  }

  onTabChanged($event) {
    this.$state.go($event.state).then(() => {
      this.setState();
    });
  }

  userActivated($event) {
    this.inactiveUsers = _.filter(this.inactiveUsers, inactiveUser => {
      return inactiveUser.id !== $event.user.id;
    });
  }

  deviceEnabled($event) {
    this.unregisteredDevices = _.filter(this.unregisteredDevices, unregisteredDevice => {
      return unregisteredDevice.id !== $event.device.id;
    });
  }

  deviceDisabled($event) {
    this.unregisteredDevices.push($event.device);
  }
}

AdminController.$inject = ['$state', '$stateParams', 'UserService', 'DeviceService'];

export default {
  template: require('./admin.html'),
  controller: AdminController
};
