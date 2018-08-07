var _ = require('underscore');

module.exports = AdminUsersController;

AdminUsersController.$inject = ['$scope', '$uibModal', '$filter', '$location', 'LocalStorageService', 'UserService'];

function AdminUsersController($scope, $uibModal, $filter, $location, LocalStorageService, UserService) {
  $scope.token = LocalStorageService.getToken();
  $scope.filter = "all"; // possible values all, active, inactive
  $scope.users = [];
  $scope.page = 0;
  $scope.itemsPerPage = 10;

  $scope.hasUserCreatePermission =  _.contains(UserService.myself.role.permissions, 'CREATE_USER');
  $scope.hasUserEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_USER');
  $scope.hasUserDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_USER');

  UserService.getAllUsers().then(function(users) {
    $scope.users = users;
  });

  $scope.filterActive = function (user) {
    switch ($scope.filter) {
    case 'all': return true;
    case 'active': return user.active;
    case 'inactive': return !user.active;
    case 'disabled': return !user.enabled;
    }
  };

  $scope.activeUsersCount = function(user) {
    return user.active === true;
  };

  $scope.reset = function() {
    $scope.page = 0;
    $scope.filter = 'all';
    $scope.userSearch = '';
  };

  $scope.newUser = function() {
    $location.path('/admin/users/new');
  };

  $scope.bulkImport = function() {
    $location.path('/admin/users/bulk');
  };

  $scope.gotoUser = function(user) {
    $location.path('/admin/users/' + user.id);
  };

  $scope.editUser = function($event, user) {
    $event.stopPropagation();

    $location.path('/admin/users/' + user.id + '/edit');
  };

  $scope.deleteUser = function($event, user) {
    $event.stopPropagation();

    var modalInstance = $uibModal.open({
      template: require('./user-delete.html'),
      resolve: {
        user: function () {
          return user;
        }
      },
      controller: ['$scope', '$uibModalInstance', 'user', function ($scope, $uibModalInstance, user) {
        $scope.user = user;

        $scope.deleteUser = function(user) {
          UserService.deleteUser(user).then(function() {
            $uibModalInstance.close(user);
          });
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function(user) {
      $scope.user = null;
      $scope.users = _.reject($scope.users, function(u) { return u.id === user.id; });
    });
  };

  $scope.activateUser = function ($event, user) {
    $event.stopPropagation();

    user.active = true;
    UserService.updateUser(user.id, user, function() {
      $scope.$broadcast('user:activated', user);
      $scope.saved = true;
    }, function(response) {
      $scope.$apply(function() {
        $scope.error = response.responseText;
      });
    });
  };

  $scope.enableUser = function ($event, user) {
    $event.stopPropagation();

    user.enabled = true;
    UserService.updateUser(user.id, user, function() {
    });
  };
}
