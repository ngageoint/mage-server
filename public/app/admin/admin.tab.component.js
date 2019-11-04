import _ from 'underscore';

class AdminTabController {
  constructor(UserService) {
    this.UserService = UserService;
  }

  hasPermission(permission) {
    return _.contains(this.UserService.myself.role.permissions, permission);
  }

  tabChanged(state) {
    this.state = state;
    
    this.onTabChanged({
      $event: {
        state: state
      }
    });
  }
}

AdminTabController.$inject = ['UserService'];

export default {
  template: require('./admin.tab.html'),
  controller: AdminTabController,
  bindings: {
    state: '@',
    inactiveUsers: '<',
    unregisteredDevices: '<',
    onTabChanged: '&'
  }
};

