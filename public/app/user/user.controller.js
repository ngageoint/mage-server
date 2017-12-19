angular
  .module('mage')
  .controller('UserController', UserController);

UserController.$inject =  ['$scope', '$location', '$timeout', 'Api', 'UserService', 'user'];

function UserController($scope, $location, $timeout, Api, UserService, user) {
  $scope.authentication = {};
  $scope.user = user;
  $scope.originalUser = angular.copy(user);
  $scope.passwordStatus = {};
  $scope.showUserStatus = false;
  $scope.avatar = null;

  Api.get(function(api) {
    var authenticationStrategies = api.authenticationStrategies || {};
    if (authenticationStrategies.local && authenticationStrategies.local.passwordMinLength) {
      $scope.passwordPlaceholder = authenticationStrategies.local.passwordMinLength + ' characters, alphanumeric';
    }
  });

  $scope.$on('userAvatar', function(event, userAvatar) {
    $scope.user.avatar = userAvatar;

    if (!userAvatar) {
      $scope.user.avatarData = null;
      return;
    }

    if (window.FileReader) {
      var reader = new FileReader();
      reader.onload = (function() {
        return function(e) {
          $scope.user.avatarData = e.target.result;
          $scope.$apply();
        };
      })(userAvatar);

      reader.readAsDataURL(userAvatar);
    }
  });

  $scope.saveUser = function() {
    var user = {
      username: this.user.username,
      displayName: this.user.displayName,
      email: this.user.email,
      avatar: $scope.avatar
    };

    if (this.user.phones && this.user.phones.length) {
      user.phone = $scope.user.phones[0].number;
    }

    // TODO throw in progress
    var progress = function(e) {
      if(e.lengthComputable){
        $scope.$apply(function() {
          $scope.uploading = true;
          $scope.uploadProgress = (e.loaded/e.total) * 100;
        });
      }
    };

    var complete = function() {
      $scope.$apply(function() {
        $scope.status("Success", "Your account information has been updated.", "alert-success");
      });
    };

    var failed = function(data) {
      $scope.$apply(function() {
        $scope.status("Error", data, "alert-danger");
      });
    };

    UserService.updateMyself(user, complete, failed, progress);
  };

  $scope.cancel = function() {
    $scope.user = angular.copy($scope.originalUser);
    $location.path('/map');
  };

  $scope.$watch('authentication.password', function() {
    $scope.form.authentication.password.$setValidity('invalid', true);
  });

  var passwordStrengthMap = {
    0: {
      type: 'danger',
      text: 'Weak'
    },
    1: {
      type: 'warning',
      text: 'Fair'
    },
    2: {
      type: 'info',
      text: 'Good'
    },
    3: {
      type: 'primary',
      text: 'Strong'
    },
    4: {
      type: 'success',
      text: 'Excellent'
    }
  };

  $scope.passwordStrengthScore = 0;
  $scope.$watch('authentication.newPassword', function(password) {
    var score = password && password.length ? zxcvbn(password, [$scope.user.username, $scope.user.displayName, $scope.user.email]).score : 0;
    $scope.passwordStrengthScore = score + 1;
    $scope.passwordStrengthType = passwordStrengthMap[score].type;
    $scope.passwordStrength = passwordStrengthMap[score].text;
  });

  $scope.updatePassword = function(form) {
    if (!form.$valid) return;

    var authentication = {
      username: this.user.username,
      password: this.authentication.password,
      newPassword: this.authentication.newPassword,
      newPasswordConfirm: this.authentication.newPasswordConfirm
    };

    UserService.updateMyPassword(authentication)
      .success(function() {
        $scope.authentication.password = "";
        $scope.authentication.newPassword = "";
        $scope.authentication.newPasswordConfirm = "";
        $scope.form.authentication.$setPristine();
        $scope.passwordStatus = {status: "success", msg: "Password successfully updated, you will be redirected to the login page."};

        $timeout(function() {
          $location.path('/signin');
        }, 5000);
      })
      .error(function(data, status) {
        if (status === 401) {
          form.password.$setValidity('invalid', false);
        } else {
          $scope.passwordStatus = {status: "danger", msg: data};
        }
      });
  };

  $scope.status = function (statusTitle, statusMessage, statusLevel) {
    $scope.statusTitle = statusTitle;
    $scope.statusMessage = statusMessage;
    $scope.statusLevel = statusLevel;
    $scope.showUserStatus = true;
  };

  $scope.$on('userAvatar', function(event, userAvatar) {
    $scope.avatar = userAvatar;
  });

}
