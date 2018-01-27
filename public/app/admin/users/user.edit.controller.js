angular
  .module('mage')
  .controller('AdminUserEditController', AdminUserEditController);

AdminUserEditController.$inject = ['$scope', '$filter', '$routeParams', '$location', 'Api', 'LocalStorageService', 'UserService', 'UserIconService'];

function AdminUserEditController($scope, $filter, $routeParams, $location, Api, LocalStorageService, UserService, UserIconService) {
  $scope.token = LocalStorageService.getToken();
  $scope.roles = [];

  Api.get(function(api) {
    var authenticationStrategies = api.authenticationStrategies || {};
    if (authenticationStrategies.local && authenticationStrategies.local.passwordMinLength) {
      $scope.passwordPlaceholder = authenticationStrategies.local.passwordMinLength + ' characters, alphanumeric';
    }
  });

  if ($routeParams.userId) {
    UserService.getUser($routeParams.userId).then(function(user) {
      $scope.user = angular.copy(user);

      $scope.iconMetadata = {
        type: $scope.user.icon.type,
        text: $scope.user.icon.text,
        color: $scope.user.icon.color
      };

    });
  } else {
    $scope.user = {};
    $scope.iconMetadata = {
      type: 'none'
    };
  }

  UserService.getRoles().success(function (roles) {
    $scope.roles = roles;
  });

  $scope.$watch('iconMetadata', function(icon) {
    if (!icon) return;

    var type = icon.type;
    if (type === 'create') {
      if (icon.text == null) {
        if ($scope.user.displayName) {
          var initials = $scope.user.displayName.match(/\b\w/g);
          var firstDisplayNamePart = initials.shift();
          var secondDisplayNamePart = initials.pop();
          icon.text = (firstDisplayNamePart + (secondDisplayNamePart ? secondDisplayNamePart : '')).toUpperCase();
        }
      }

      if (!icon.color) {
        icon.color = '#' + Math.floor(Math.random()*16777215).toString(16);
      }
    } else if (type === 'upload') {
      if ($scope.user.icon.type !== 'upload') {
        $scope.user.iconUrl = null;
      }
    }
  }, true);

  $scope.$on('userAvatar', function(event, userAvatar) {
    if (!$scope.user) return;

    if (!userAvatar) {
      $scope.user.avatarData = null;
      $scope.user.avatar = null;
      return;
    }

    $scope.user.avatar = userAvatar;

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

  $scope.$on('userIcon', function(event, userIcon) {
    $scope.user.icon = userIcon;

    if (window.FileReader) {
      var reader = new FileReader();
      reader.onload = (function() {
        return function(e) {
          $scope.user.iconData = e.target.result;
          $scope.$apply();
        };
      })(userIcon);

      reader.readAsDataURL(userIcon);
    }
  });

  $scope.cancel = function() {
    var path = $scope.user.id ? '/admin/users/' + $scope.user.id : '/admin/users';
    $location.path(path);
  };

  $scope.saveUser = function () {
    $scope.saving = true;
    $scope.error = false;

    if ($scope.iconMetadata.type === 'create') {
      var canvas = $scope.iconMetadata.getCanvas();
      $scope.user.icon = UserIconService.canvasToPng(canvas);
    }

    var user = {
      username: $scope.user.username,
      displayName: $scope.user.displayName,
      email: $scope.user.email,
      password: $scope.user.password,
      passwordconfirm: $scope.user.passwordconfirm,
      avatar: $scope.user.avatar,
      icon: $scope.user.icon,
      iconMetadata: JSON.stringify($scope.iconMetadata)
    };

    if ($scope.user.phones && $scope.user.phones.length) {
      user.phone = $scope.user.phones[0].number;
    }

    if ($scope.user.role) {
      user.roleId = $scope.user.role.id;
    }

    var failure = function(response) {
      $scope.$apply(function() {
        $scope.saving = false;
        $scope.error = response.responseText;
      });
    };

    var progress = function(e) {
      if(e.lengthComputable){
        $scope.$apply(function() {
          $scope.uploading = true;
          $scope.uploadProgress = (e.loaded/e.total) * 100;
        });
      }
    };

    if ($scope.user.id) {
      UserService.updateUser($scope.user.id, user, function() {
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
  };

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
  $scope.$watch('user.password', function(password) {
    var score = password && password.length ? zxcvbn(password, [$scope.user.username, $scope.user.displayName, $scope.user.email]).score : 0;
    $scope.passwordStrengthScore = score + 1;
    $scope.passwordStrengthType = passwordStrengthMap[score].type;
    $scope.passwordStrength = passwordStrengthMap[score].text;
  });

  $scope.updatePassword = function(form) {
    form.passwordconfirm.$setValidity("nomatch", $scope.user.password === $scope.user.passwordconfirm);

    if (!form.$valid) return;

    var user = {
      password: $scope.user.password,
      passwordconfirm: $scope.user.passwordconfirm
    };

    UserService.updateUser($scope.user.id, user, function() {
      $scope.$apply(function() {
        $location.path('/admin/users/' + $scope.user.id);
      });
    }, function(data) {
      $scope.$apply(function() {
        $scope.passwordStatus = {status: "danger", msg: data.responseText};
      });
    });
  };
}
