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
    this.userSearch = '';
    this.previousSearch = '';
    this.itemsPerPage = 10;

    this.stateAndData = new Map();
    this.stateAndData['all'] = {
      countFilter: {},
      userFilter: {limit: this.itemsPerPage, sort: ['displayName', '_id']},
      userCount: 0,
      pageInfo: {}
    };
    this.stateAndData['active'] = {
      countFilter: {active: true},
      userFilter: {active: true, limit: this.itemsPerPage, sort: ['displayName', '_id']},
      userCount: 0,
      pageInfo: {}
    };
    this.stateAndData['inactive'] = {
      countFilter: {active: false},
      userFilter: {active: false, limit: this.itemsPerPage, sort: ['displayName', '_id']},
      userCount: 0,
      pageInfo: {}
    };
    this.stateAndData['disabled'] = {
      countFilter: {enabled: false},
      userFilter: {enabled: false, limit: this.itemsPerPage, sort: ['displayName', '_id']},
      userCount: 0,
      pageInfo: {}
    };
    this.stateAndData['search'] = {};
  
    this.hasUserCreatePermission =  _.contains(UserService.myself.role.permissions, 'CREATE_USER');
    this.hasUserEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_USER');
    this.hasUserDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_USER');

    // For some reason angular is not calling into filter function with correct context
    this.filterActive = this._filterActive.bind(this);
  }

  $onInit() {

    for (const [key, value] of Object.entries(this.stateAndData)) {

      if(value.countFilter == null || value.userFilter == null) {
        continue;
      }

      this.UserService.getUserCount(value.countFilter).then(result => {
        if(result && result.data && result.data.count) {
          this.stateAndData[key].userCount = result.data.count;
        }
      });

      this.UserService.getAllUsers(value.userFilter).then(pageInfo => {
        this.stateAndData[key].pageInfo = pageInfo;
      });
    }
   
  }

  count(state) {
    return this.stateAndData[state].userCount;
  }

  users() {
    return this.stateAndData[this.filter].pageInfo.users;
  }

  hasNext() {
    var status = false;

    if(this.stateAndData[this.filter].pageInfo && this.stateAndData[this.filter].pageInfo.links) {
      status = this.stateAndData[this.filter].pageInfo.links.next != null && 
      this.stateAndData[this.filter].pageInfo.links.next !== "";
    }

    return status;
  }

  next() {
    this.move(this.stateAndData[this.filter].pageInfo.links.next);
  }

  hasPrevious() {
    var status = false;

    if(this.stateAndData[this.filter].pageInfo && this.stateAndData[this.filter].pageInfo.links) {
      status = this.stateAndData[this.filter].pageInfo.links.prev != null && 
      this.stateAndData[this.filter].pageInfo.links.prev !== "";
    }

    return status;
  }

  previous() {
    this.move(this.stateAndData[this.filter].pageInfo.links.prev);
  }

  move(start) {
    var filter = this.stateAndData[this.filter].userFilter;
    filter.start = start;
    this.UserService.getAllUsers(filter).then(pageInfo => {
      this.stateAndData[this.filter].pageInfo = pageInfo;
    });
  }

  search() {
    var results = [];

    if(this.userSearch == '') {
      //No search being performed
      results = this.users();
    } else if (this.users().length == this.count(this.filter)) { 
      //Search is being performed, but the set of users is so 
      //small, just do the search client side
      results = this.users();
    } else if (this.previousSearch != '' && this.previousSearch == this.userSearch) {
      //No need to keep searching the same info over and over
      results = this.stateAndData['search'].pageInfo.users;
    } else {
      //Perform the server side searching
      this.previousSearch = this.userSearch;

      var filter = this.stateAndData[this.filter].userFilter;
      filter.or = {
        displayName: '.*' + this.userSearch + '.*',
        email: '.*' + this.userSearch + '.*'
      };
      this.UserService.getAllUsers(filter).then(pageInfo => {
        this.stateAndData['search'].pageInfo = pageInfo;
        results = this.stateAndData['search'].pageInfo.users;
      });
    }

    return results;
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
    this.previousSearch = '';
    this.stateAndData['search'] = {};
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
      var users = _.reject(this.stateAndData[this.filter].pageInfo.users, u => { return u.id === user.id; });
      this.stateAndData[this.filter].pageInfo.users = users;
      this.stateAndData[this.filter].userCount = this.stateAndData[this.filter].userCount -1;
    });
  }

  activateUser($event, user) {
    $event.stopPropagation();

    user.active = true;
    this.UserService.updateUser(user.id, user, () => {
      var users = _.reject(this.stateAndData['inactive'].pageInfo.users, u => { return u.id === user.id; });
      this.stateAndData['inactive'].pageInfo.users = users;
      this.stateAndData['inactive'].userCount = this.stateAndData['inactive'].userCount -1;

      this.stateAndData['active'].pageInfo.users.push(user);
      this.stateAndData['active'].userCount = this.stateAndData['active'].userCount + 1;

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
      var users = _.reject(this.stateAndData['disabled'].pageInfo.users, u => { return u.id === user.id; });
      this.stateAndData['disabled'].pageInfo.users = users;
      this.stateAndData['disabled'].userCount = this.stateAndData['disabled'].userCount -1;
    });
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
