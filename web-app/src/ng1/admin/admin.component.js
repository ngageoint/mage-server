import _ from 'underscore';

class AdminController {
  constructor($state, $stateParams, $transitions, UserPagingService, DevicePagingService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$transitions = $transitions;
    this.UserPagingService = UserPagingService;
    this.DevicePagingService = DevicePagingService;

    this.userState = 'inactive';
    this.inactiveUsers = [];
    this.stateAndData = this.UserPagingService.constructDefault();

    this.deviceState = 'unregistered';
    this.unregisteredDevices = [];
    this.deviceStateAndData = this.DevicePagingService.constructDefault();

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

    this.deviceStateAndData.delete('all');
    this.deviceStateAndData.delete('registered');

    this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.unregisteredDevices = this.DevicePagingService.devices(this.deviceStateAndData[this.deviceState]);
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
    this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.unregisteredDevices = this.DevicePagingService.devices(this.deviceStateAndData[this.deviceState]);
    });
  }

  deviceUnregistered($event) {
    this.DevicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.unregisteredDevices = this.DevicePagingService.devices(this.deviceStateAndData[this.deviceState]);
    });
  }
}

AdminController.$inject = ['$state', '$stateParams', '$transitions', 'UserPagingService', 'DevicePagingService'];

export default {
  template: require('./admin.html'),
  controller: AdminController
};
