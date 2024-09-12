import _ from 'underscore';

class AdminTabController {
  constructor($state, UserService, LocalStorageService) {
    this.$state = $state;
    this.UserService = UserService;
    this.token = LocalStorageService.getToken()
  }

  hasPermission(permission) {
    return _.contains(this.UserService.myself.role.permissions, permission);
  }

  tabChanged(state) {
    this.$state.go(state);
  }
}

AdminTabController.$inject = ['$state', 'UserService', 'LocalStorageService'];

export default {
  template: require('./admin.tab.html'),
  controller: AdminTabController,
  bindings: {
    stateName: '@',
    inactiveUsers: '<',
    unregisteredDevices: '<',
    pluginTabs: '<'
  }
};
