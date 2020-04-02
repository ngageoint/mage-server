import _ from 'underscore';

class AdminUsersController {
  constructor($uibModal, $state, $timeout, LocalStorageService, UserService) {
    this.$uibModal = $uibModal;
    this.$state = $state;
    this.$timeout = $timeout;
    this.LocalStorageService = LocalStorageService;
    this.UserService = UserService;

    this.token = LocalStorageService.getToken();
    this.filter = "all"; // possible values all, active, inactive
    this.search = '';
    this.users = [];
    this.page = 0;
    this.itemsPerPage = 10;
    this.numPages = 0;

    this.stateAndData = new Map();
    this.stateAndData['all'] = {
      filter: {},
      userCount: 0,
      currentPage: 0,
      numPages: 0,
      users: []
    };
    this.stateAndData['active'] = {
      filter: {active: true},
      userCount: 0,
      currentPage: 0,
      numPages: 0,
      users: []
    };
    this.stateAndData['inactive'] = {
      filter: {active: false},
      userCount: 0,
      currentPage: 0,
      numPages: 0,
      users: []
    };
    this.stateAndData['disabled'] = {
      filter: {enabled: false},
      userCount: 0,
      currentPage: 0,
      numPages: 0,
      users: []
    };
  
    this.hasUserCreatePermission =  _.contains(UserService.myself.role.permissions, 'CREATE_USER');
    this.hasUserEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_USER');
    this.hasUserDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_USER');

    // For some reason angular is not calling into filter function with correct context
    this.filterActive = this._filterActive.bind(this);
  }

  $onInit() {

    for (const [key, value] of Object.entries(this.stateAndData)) {

      this.UserService.getUserCount(value.filter).then(result => {
        
        if(result && result.data && result.data.count) {
          this.stateAndData[key].userCount = result.data.count;

          let totalPages = parseInt(result.data.count / this.itemsPerPage);
          if(result.data.count >= this.itemsPerPage && result.data.count % this.itemsPerPage !== 0) {
            totalPages++;
          }
          this.stateAndData[key].numPages = totalPages;
        }
      });
    }

    this.UserService.getAllUsers({limit: this.itemsPerPage}).then(users => {
      this.users = users;
    });
  }

  count(state) {
    return this.stateAndData[state].userCount;
  }

  _filterActive(user) {
    switch (this.filter) {
    case 'all': return true;
    case 'active': return user.active;
    case 'inactive': return !user.active;
    case 'disabled': return !user.enabled;
    }
  }

  reset() {
    this.page = 0;
    this.filter = 'all';
    this.userSearch = '';
  }

  newUser() {
    this.$state.go('admin.createUser');
  }

  bulkImport() {
    this.$state.go('admin.bulkUser');
  }

  gotoUser(user) {
    this.$state.go('admin.user', { userId: user.id });
  }

  editUser($event, user) {
    $event.stopPropagation();
    this.$state.go('admin.editUser', { userId: user.id });
  }

  deleteUser($event, user) {
    $event.stopPropagation();

    var modalInstance = this.$uibModal.open({
      resolve: {
        user: () => {
          return user;
        }
      },
      component: "adminUserDelete"
    });

    modalInstance.result.then(user => {
      this.user = null;
      this.users = _.reject(this.users, u => { return u.id === user.id; });
    });
  }

  activateUser($event, user) {
    $event.stopPropagation();

    user.active = true;
    this.UserService.updateUser(user.id, user, () => {
      this.saved = true;

      this.onUserActivated({
        $event: {
          user: user
        }
      });
    }, response => {
      this.$timeout(() => {
        this.error = response.responseText;
      });
    });
  }

  enableUser($event, user) {
    $event.stopPropagation();

    user.enabled = true;
    this.UserService.updateUser(user.id, user, () => {});
  }
}

AdminUsersController.$inject = ['$uibModal', '$state', '$timeout', 'LocalStorageService', 'UserService'];

export default {
  template: require('./users.html'),
  bindings: {
    onUserActivated: '&'
  },
  controller: AdminUsersController
};
