import _ from 'underscore';

class AdminUsersController {
  constructor($uibModal, $state, $timeout, LocalStorageService, UserService, UserPagingService) {
    this.$uibModal = $uibModal;
    this.$state = $state;
    this.$timeout = $timeout;
    this.LocalStorageService = LocalStorageService;
    this.UserService = UserService;
    this.UserPagingService = UserPagingService;

    this.users = [];
    this.stateAndData = this.UserPagingService.constructDefault();

    this.token = LocalStorageService.getToken();
    this.filter = "all"; // possible values all, active, inactive
    this.userSearch = '';

    this.hasUserCreatePermission = _.contains(UserService.myself.role.permissions, 'CREATE_USER');
    this.hasUserEditPermission = _.contains(UserService.myself.role.permissions, 'UPDATE_USER');
    this.hasUserDeletePermission = _.contains(UserService.myself.role.permissions, 'DELETE_USER');
  }

  $onInit() {
    this.UserPagingService.refresh(this.stateAndData).then(() => {
      this.users = this.UserPagingService.users(this.stateAndData[this.filter]);
    });
  }

  count(state) {
    return this.stateAndData[state].userCount;
  }

  hasNext() {
    return this.UserPagingService.hasNext(this.stateAndData[this.filter]);
  }

  next() {
    this.UserPagingService.next(this.stateAndData[this.filter]).then(users => {
      this.users = users;
    });
  }

  hasPrevious() {
    return this.UserPagingService.hasPrevious(this.stateAndData[this.filter]);
  }

  previous() {
    this.UserPagingService.previous(this.stateAndData[this.filter]).then(users => {
      this.users = users;
    });
  }

  search() {
    this.UserPagingService.search(this.stateAndData[this.filter], this.userSearch).then(users => {
      this.users = users;
    });
  }

  changeFilter(state) {
    this.filter = state;
    this.search();
  }

  reset() {
    this.filter = 'all';
    this.userSearch = '';
    this.stateAndData = this.UserPagingService.constructDefault();
    this.UserPagingService.refresh(this.stateAndData).then(() => {
      this.users = this.UserPagingService.users(this.stateAndData[this.filter]);
    });
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

    modalInstance.result.then(() => {
      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.users = this.UserPagingService.users(this.stateAndData[this.filter]);
      });
    });
  }

  activateUser($event, user) {
    $event.stopPropagation();

    user.active = true;
    this.UserService.updateUser(user.id, user, () => {
      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.users = this.UserPagingService.users(this.stateAndData[this.filter]);
      });

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
    this.UserService.updateUser(user.id, user, () => {
      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.users = this.UserPagingService.users(this.stateAndData[this.filter]);
      });
    });
  }
}

AdminUsersController.$inject = ['$uibModal', '$state', '$timeout', 'LocalStorageService', 'UserService', 'UserPagingService'];

export default {
  template: require('./users.html'),
  bindings: {
    onUserActivated: '&'
  },
  controller: AdminUsersController
};
