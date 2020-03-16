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
  
    this.hasUserCreatePermission =  _.contains(UserService.myself.role.permissions, 'CREATE_USER');
    this.hasUserEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_USER');
    this.hasUserDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_USER');

    // For some reason angular is not calling into filter function with correct context
    this.filterActive = this._filterActive.bind(this);
  }

  $onInit() {
    this.UserService.getUserCount().then(result => {
      if(result && result.data && result.data.count) {
        this.numPages = parseInt(result.data.count / this.itemsPerPage);
        if(result.data.count >= this.itemsPerPage && result.data.count % this.itemsPerPage !== 0) {
           this.numPages++;
        }
      }
    });
  }

  _filterActive(user) {
    switch (this.filter) {
    case 'all': return true;
    case 'active': return user.active;
    case 'inactive': return !user.active;
    case 'disabled': return !user.enabled;
    }
  }

  activeUsersCount(user) {
    return user.active === true;
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
