angular
  .module('mage')
  .controller('AdminUserController', AdminUserController);

AdminUserController.$inject = ['$scope', '$injector', '$filter', '$routeParams', '$location', 'LocalStorageService', 'UserService'];

function AdminUserController($scope, $injector, $filter, $routeParams, $location, LocalStorageService, UserService) {
  $scope.token = LocalStorageService.getToken();

  UserService.getUser($routeParams.userId).then(function(user) {
    $scope.user = user.data || user;
    $scope.avatarUrl = avatarUrl($scope.user, LocalStorageService.getToken());
    $scope.iconUrl = iconUrl($scope.user, LocalStorageService.getToken());
  });

  $scope.$on('userAvatar', function(event, userAvatar) {
    $scope.user.avatar = userAvatar;
  });

  $scope.$on('userIcon', function(event, userIcon) {
    $scope.user.icon = userIcon;
  });

  $scope.editUser = function(user) {
    $location.path('/admin/users/' + user.id + '/edit');
  }

  function avatarUrl(user, token) {
    if (user && user.avatarUrl) {
      return user.avatarUrl + "?access_token=" + token;
    } else {
      return "img/missing_photo.png";
    }
  }

  function iconUrl(user, token) {
    if (user && user.iconUrl) {
      return user.iconUrl + "?access_token=" + token;
    } else {
      return "img/missing_marker.png";
    }
  }

  $scope.deleteUser = function(user) {
    var modalInstance = $injector.get('$modal').open({
      templateUrl: '/app/admin/users/user-delete.html',
      resolve: {
        user: function () {
          return user;
        }
      },
      controller: ['$scope', '$modalInstance', 'user', function ($scope, $modalInstance, user) {
        $scope.user = user;

        $scope.deleteUser = function(user, force) {
          UserService.deleteUser(user).success(function() {
            $modalInstance.close(user);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function(user) {
      $location.path('/admin/users');
    });
  }

  /* shortcut for giving a user the USER_ROLE */
  $scope.activateUser = function(user) {
    user.active = true;
    UserService.updateUser(user.id, user, function(response) {
    }, function(response) {
    });
  }

  $scope.deactivateUser = function (user) {
    user.active = false;
    UserService.updateUser(user.id, user, function(response) {

    }, function(response) {

    });
  }
}
