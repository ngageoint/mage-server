angular
  .module('mage')
  .controller('AdminUsersController', AdminUsersController);

AdminUsersController.$inject = ['$scope', '$injector', '$filter', '$location', 'LocalStorageService', 'UserService'];

function AdminUsersController($scope, $injector, $filter, $location, LocalStorageService, UserService) {
  $scope.token = LocalStorageService.getToken();
  $scope.filter = "all"; // possible values all, active, inactive
  $scope.users = [];
  $scope.page = 0;
  $scope.itemsPerPage = 10;

  UserService.getAllUsers({forceRefresh: true, populate: 'roleId'}).success(function(users) {
    $scope.users = users;
  });

  $scope.filterActive = function (user) {
    switch ($scope.filter) {
    case 'all': return true;
    case 'active': return user.active;
    case 'inactive': return !user.active;
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

  $scope.gotoUser = function(user) {
    $location.path('/admin/users/' + user.id);
  };

  $scope.editUser = function($event, user) {
    $event.stopPropagation();

    $location.path('/admin/users/' + user.id + '/edit');
  };

  $scope.deleteUser = function($event, user) {
    $event.stopPropagation();

    var modalInstance = $injector.get('$modal').open({
      templateUrl: '/app/admin/users/user-delete.html',
      resolve: {
        user: function () {
          return user;
        }
      },
      controller: ['$scope', '$modalInstance', 'user', function ($scope, $modalInstance, user) {
        $scope.user = user;

        $scope.deleteUser = function(user) {
          UserService.deleteUser(user).success(function() {
            $modalInstance.close(user);
          });
        };

        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function(user) {
      $scope.user = null;
      $scope.users = _.reject($scope.users, function(u) { return u.id === user.id; });
    });
  };

  /* shortcut for giving a user the USER_ROLE */
  $scope.activateUser = function ($event, user) {
    $event.stopPropagation();

    user.active = true;
    UserService.updateUser(user.id, user, function() {
      $scope.$apply(function() {
        $scope.saved = true;
      });
    }, function(response) {
      $scope.$apply(function() {
        $scope.error = response.responseText;
      });
    });
  };
}
