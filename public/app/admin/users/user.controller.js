var _ = require('underscore')
  , moment = require('moment');

module.exports = AdminUserController;

AdminUserController.$inject = ['$scope', '$uibModal', '$filter', '$routeParams', '$location', '$q', 'LocalStorageService', 'UserService', 'LoginService', 'DeviceService', 'Team'];

function AdminUserController($scope, $uibModal, $filter, $routeParams, $location, $q, LocalStorageService, UserService, LoginService, DeviceService, Team) {
  $scope.userTeams = [];
  $scope.nonTeams = [];
  $scope.teamsPage = 0;
  $scope.teamsPerPage = 10;

  $scope.hasUserEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_USER');
  $scope.hasUserDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_USER');

  var filter = {
    user: {id: $routeParams.userId}
  };

  $scope.device = {};
  $scope.login = {
    startDateOpened: false,
    endDateOpened: false
  };
  var firstLogin = null;
  $scope.showPrevious = false;
  $scope.showNext = true;

  $q.all({
    user: UserService.getUser($routeParams.userId),
    teams: Team.query({populate: false}).$promise}
  ).then(function(result) {
    $scope.user = result.user;
    $scope.avatarUrl = avatarUrl($scope.user, LocalStorageService.getToken());
    $scope.iconUrl = iconUrl($scope.user, LocalStorageService.getToken());

    $scope.teams = result.teams;
    $scope.team = {};

    $scope.userTeams = _.chain(result.teams)
      .filter(function(team) {
        return _.some(team.users, function(user) {
          return $scope.user.id === user.id;
        });
      })
      .value();

    var teams = _.chain($scope.teams);
    if (!_.contains(UserService.myself.role.permissions, 'UPDATE_TEAM')) {
      // filter teams based on acl
      teams = teams.filter(function(team) {
        var permissions = team.acl[UserService.myself.id] ? team.acl[UserService.myself.id].permissions : [];
        return _.contains(permissions, 'update');
      });
    }

    teams = teams.reject(function(team) {
      return _.some(team.users, function(user) {
        return $scope.user.id === user.id;
      });
    });

    $scope.nonTeams = teams.value();
  });

  LoginService.query({filter: filter, limit: $scope.loginResultsLimit}).success(function(loginPage) {
    $scope.loginPage = loginPage;
    if (loginPage.logins.length) {
      firstLogin = loginPage.logins[0];
    }
  });

  DeviceService.getAllDevices().then(function (devices) {
    $scope.devices = devices;
  });

  $scope.$on('userAvatar', function(event, userAvatar) {
    $scope.user.avatar = userAvatar;
  });

  $scope.$on('userIcon', function(event, userIcon) {
    $scope.user.icon = userIcon;
  });

  $scope.iconClass = function(device) {
    if (!device) return;

    if (device.iconClass) return device.iconClass;

    var userAgent = device.userAgent || "";

    if (device.appVersion === 'Web Client') {
      device.iconClass = 'fa-desktop admin-desktop-icon-xs';
    } else if (userAgent.toLowerCase().indexOf("android") !== -1) {
      device.iconClass = 'fa-android admin-android-icon-xs';
    } else if(userAgent.toLowerCase().indexOf("ios") !== -1) {
      device.iconClass = 'fa-apple admin-apple-icon-xs';
    } else {
      device.iconClass = 'fa-mobile admin-generic-icon-xs';
    }

    return device.iconClass;
  };

  $scope.editUser = function(user) {
    $location.path('/admin/users/' + user.id + '/edit');
  };

  function avatarUrl(user, token) {
    if (user && user.avatarUrl) {
      return user.avatarUrl + "?access_token=" + token;
    } else {
      return "images/missing_photo.png";
    }
  }

  function iconUrl(user, token) {
    if (user && user.iconUrl) {
      return user.iconUrl + "?access_token=" + token;
    } else {
      return "images/missing_marker.png";
    }
  }

  $scope.addUserToTeam = function(team) {
    Team.addUser({id: team.id}, $scope.user, function(team) {
      $scope.userTeams.push(team);
      $scope.nonTeams = _.reject($scope.nonTeams, function(t) { return t.id === team.id; });

      $scope.team = {};
    });
  };

  $scope.removeUserFromTeam = function($event, team) {
    $event.stopPropagation();

    Team.removeUser({id: team.id, userId: $scope.user.id}, function(team) {
      $scope.userTeams = _.reject($scope.userTeams, function(t) { return t.id === team.id; });
      $scope.nonTeams.push(team);
    });
  };

  $scope.deleteUser = function(user) {
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

    modalInstance.result.then(function() {
      $location.path('/admin/users');
    });
  };

  /* shortcut for giving a user the USER_ROLE */
  $scope.activateUser = function(user) {
    user.active = true;
    UserService.updateUser(user.id, user, function() {
      $scope.$broadcast('user:activated', user);
    });
  };

  $scope.deactivateUser = function (user) {
    user.active = false;
    UserService.updateUser(user.id, user, function() {
      $scope.$broadcast('user:inactivated', user);
    });
  };

  $scope.gotoTeam = function(team) {
    $location.path('/admin/teams/' + team.id);
  };

  $scope.gotoDevice = function(device) {
    $location.path('/admin/devices/' + device.id);
  };

  $scope.pageLogin = function(url) {
    LoginService.query({url: url, filter: filter, limit: $scope.loginResultsLimit}).success(function(loginPage) {

      if (loginPage.logins.length) {
        $scope.loginPage = loginPage;
        $scope.showNext = loginPage.logins.length !== 0;
        $scope.showPrevious = loginPage.logins[0].id !== firstLogin.id;
      }
    });
  };

  $scope.filterLogins = function() {
    filter.device = $scope.device.selected;
    filter.startDate = $scope.login.startDate;
    if ($scope.login.endDate) {
      filter.endDate = moment($scope.login.endDate).endOf('day').toDate();
    }

    LoginService.query({filter: filter, limit: $scope.loginResultsLimit}).success(function(loginPage) {
      $scope.showNext = loginPage.logins.length !== 0;
      $scope.showPrevious = false;
      $scope.loginPage = loginPage;
    });
  };

  $scope.openLoginStart = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.login.startDateOpened = true;
  };

  $scope.openLoginEnd = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.login.endDateOpened = true;
  };

  $scope.loginResultsLimitChanged = function() {
    $scope.filterLogins();
  };

  $scope.$watch('login.startDate', function(newDate, oldDate) {
    if (!newDate && !oldDate) return;

    $scope.filterLogins();
  });

  $scope.$watch('login.endDate', function(newDate, oldDate) {
    if (!newDate && !oldDate) return;

    $scope.filterLogins();
  });
}
