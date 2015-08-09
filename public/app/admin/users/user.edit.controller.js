angular
  .module('mage')
  .controller('AdminUserEditController', AdminUserEditController);

AdminUserEditController.$inject = ['$scope', '$injector', '$filter', '$routeParams', '$location', 'LocalStorageService', 'UserService'];

function AdminUserEditController($scope, $injector, $filter, $routeParams, $location, LocalStorageService, UserService) {
  $scope.token = LocalStorageService.getToken();
  $scope.roles = [];

  if ($routeParams.userId) {
    UserService.getUser($routeParams.userId).then(function(user) {
      $scope.user = angular.copy(user.data);
    });
  } else {
    $scope.user = {};
  }

  UserService.getRoles().success(function (roles) {
    $scope.roles = roles;
  });

  $scope.$on('userAvatar', function(event, userAvatar) {
    $scope.user.avatar = userAvatar;
  });

  $scope.$on('userIcon', function(event, userIcon) {
    $scope.user.icon = userIcon;
  });

  $scope.cancel = function() {
    $location.path('/admin/users/' + $scope.user.id);
  }

  $scope.saveUser = function () {
    $scope.saving = true;
    $scope.error = false;

    var user = {
      username: $scope.user.username,
      firstname: $scope.user.firstname,
      lastname: $scope.user.lastname,
      email: $scope.user.email,
      phone: $scope.user.phone,
      p***REMOVED***word: $scope.user.p***REMOVED***word,
      p***REMOVED***wordconfirm: $scope.user.p***REMOVED***wordconfirm,
      roleId: $scope.user.role.id,
      avatar: $scope.user.avatar,
      icon: $scope.user.icon
    };

    var failure = function(response) {
      $scope.$apply(function() {
        $scope.saving = false;
        $scope.error = response.responseText;
      });
    }

    var progress = function(e) {
      if(e.lengthComputable){
        $scope.$apply(function() {
          $scope.uploading = true;
          $scope.uploadProgress = (e.loaded/e.total) * 100;
        });
      }
    }

    if ($scope.user.id) {
      UserService.updateUser($scope.user.id, user, function(response) {
        $scope.$apply(function() {
          $location.path('/admin/users/' + $scope.user.id);
        });
      }, failure, progress);
    } else {
      UserService.createUser(user, function(newUser) {
        $scope.$apply(function() {
          $location.path('/admin/users/' + newUser.id);
        });
      }, failure, progress);
    }
  }
}
