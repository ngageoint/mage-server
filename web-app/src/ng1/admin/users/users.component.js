import _ from 'underscore';
import {NgZone} from '@angular/core';

class AdminUsersController {
  constructor($uibModal, $state, $timeout, LocalStorageService, UserService, UserPagingService) {
    this.$uibModal = $uibModal;
    this.$state = $state;
    this.$timeout = $timeout;
    this.LocalStorageService = LocalStorageService;
    this.UserService = UserService;
    this.pagingHelper = UserPagingService;
    this.ngZ = new NgZone({ enableLongStackTrace: false });
    
    this.users = [];
    this.stateAndData = this.pagingHelper.constructDefault();

    this.token = LocalStorageService.getToken();
    this.filter = "all"; // possible values all, active, inactive
    this.userSearch = '';

    this.hasUserCreatePermission = _.contains(UserService.myself.role.permissions, 'CREATE_USER');
    this.hasUserEditPermission = _.contains(UserService.myself.role.permissions, 'UPDATE_USER');
    this.hasUserDeletePermission = _.contains(UserService.myself.role.permissions, 'DELETE_USER');

    // For some reason angular is not calling into filter function with correct context
    this.filterActive = this._filterActive.bind(this);
  }

  $onInit() {

    this.pagingHelper.refresh(this.stateAndData).then(() => {
      this.ngZ.run(() => {
        this.users = this.pagingHelper.users(this.stateAndData[this.filter]);
      });
    });
  }

  count(state) {
    return this.pagingHelper.count(this.stateAndData[state]);
  }

  hasNext() {
    return this.pagingHelper.hasNext(this.stateAndData[this.filter]);
  }

  next() {
    this.pagingHelper.next(this.stateAndData[this.filter]).then(users => {
      this.ngZ.run(() => {
        this.users = users;
      });
    });
  }

  hasPrevious() {
    return this.pagingHelper.hasPrevious(this.stateAndData[this.filter]);
  }

  previous() {
    this.pagingHelper.previous(this.stateAndData[this.filter]).then(users => {
      this.ngZ.run(() => {
        this.users = users;
      });
    });
  }

  search() {
    this.pagingHelper.search(this.stateAndData[this.filter], this.userSearch).then(users => {
      this.ngZ.run(() => {
        this.users = users;
      });
    });
  }

  changeFilter(state) {
    this.filter = state;
    this.search();
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
    this.filter = 'all';
    this.userSearch = '';
    this.search();
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
      this.pagingHelper.refresh(this.stateAndData).then(() => {
        this.ngZ.run(() => {
          this.users = this.pagingHelper.users(this.stateAndData[this.filter]);
        });
      });
    });
  }

  activateUser($event, user) {
    $event.stopPropagation();

    user.active = true;
    this.UserService.updateUser(user.id, user, () => {
      this.pagingHelper.refresh(this.stateAndData).then(() => {
        this.ngZ.run(() => {
          this.users = this.pagingHelper.users(this.stateAndData[this.filter]);
        });
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
      this.pagingHelper.refresh(this.stateAndData).then(() => {
        this.ngZ.run(() => {
          this.users = this.pagingHelper.users(this.stateAndData[this.filter]);
        });
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
