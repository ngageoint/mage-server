import _ from 'underscore';

class AdminTabController {
  constructor($state, UserService) {
    this.$state = $state;
    this.UserService = UserService;
  }

  hasPermission(permission) {
    return _.contains(this.UserService.myself.role.permissions, permission);
  }

  tabChanged(state) {
    this.$state.go(state);
  }
}

AdminTabController.$inject = ['$state', 'UserService'];

export default {
  template: require('./admin.tab.html'),
  controller: AdminTabController,
  bindings: {
    state: '@',
    inactiveUsers: '<',
    unregisteredDevices: '<'
  }
};

