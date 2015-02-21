angular
  .module('mage')
  .controller('AdminUsersController', AdminUsersController);

AdminUsersController.$inject = ['$scope', '$injector', '$filter', 'TokenService', 'UserService'];

function AdminUsersController($scope, $injector, $filter, TokenService, UserService) {
  $scope.token = TokenService.getToken();
  $scope.filter = "all"; // possible values all, active, inactive
  $scope.users = [];
  $scope.roles = [];
  $scope.page = 0;
  $scope.itemsPerPage = 10;

  UserService.getRoles().success(function (roles) {
    $scope.roles = roles;
  });

  UserService.getAllUsers(true).success(function(users) {
    $scope.users = users;
  });

  $scope.$on('userAvatar', function(event, userAvatar) {
    $scope.user.avatar = userAvatar;
  });

  $scope.$on('userIcon', function(event, userIcon) {
    $scope.user.icon = userIcon;
  });

  $scope.filterActive = function (user) {
    switch ($scope.filter) {
      case 'all': return true;
      case 'active': return user.active;
      case 'inactive': return !user.active;
    }
  }

  $scope.newUser = function() {
    $scope.user = {};
  }

  $scope.editUser = function(user) {
    $scope.edit = false;

    // TODO temp code to convert array of phones to one phone
    if (user.phones && user.phones.length > 0) {
      user.phone = user.phones[0].number;
    }

    $scope.user = user;
  }

  var debounceHideSave = _.debounce(function() {
    $scope.$apply(function() {
      $scope.saved = false;
    });
  }, 5000);

  $scope.saveUser = function () {
    $scope.saving = true;
    $scope.error = false;

    var user = {
      username: $scope.user.username,
      firstname: $scope.user.firstname,
      lastname: $scope.user.lastname,
      email: $scope.user.email,
      phone: $scope.user.phone,
      p***REMOVED***word: this.user.p***REMOVED***word,
      p***REMOVED***wordconfirm: this.user.p***REMOVED***wordconfirm,
      role: $scope.user.role,
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
          $scope.saved = true;
          $scope.saving = false;
          debounceHideSave();
        });
      }, failure, progress);
    } else {
      UserService.createUser(user, function(response) {
        $scope.$apply(function() {
          $scope.saved = true;
          $scope.saving = false;
          debounceHideSave();
          $scope.users.push(response);
        });
      }, failure, progress);
    }
  }

  $scope.deleteUser = function(user) {
    var modalInstance = $injector.get('$modal').open({
      templateUrl: '/js/app/partials/admin/delete-user.html',
      resolve: {
        user: function () {
          return user;
        }
      },
      controller: function ($scope, $modalInstance, user) {
        $scope.user = user;

        $scope.deleteUser = function(user, force) {
          UserService.deleteUser(user).success(function() {
            $modalInstance.close(user);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }
    });

    modalInstance.result.then(function(user) {
      $scope.user = null;
      $scope.users = _.reject($scope.users, function(u) { return u.id == user.id});
    });
  }

  $scope.refresh = function() {
    $scope.users = [];
    UserService.getAllUsers().success(function (users) {
      $scope.users = users;
    });
  }

  /* shortcut for giving a user the USER_ROLE */
  $scope.activateUser = function (user) {
    user.active = true;
    UserService.updateUser(user.id, user, function(response) {
      $scope.$apply(function() {
        $scope.saved = true;
        debounceHideSave();
      });
    }, function(response) {
      $scope.$apply(function() {
        $scope.error = response.responseText;
      });
    });
  }
}
