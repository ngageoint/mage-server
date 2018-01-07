var _ = require('underscore')
  , Papa = require('papaparse');

module.exports = AdminUserBulkController;

AdminUserBulkController.$inject = ['$scope', '$filter', '$routeParams', '$location', '$q', 'LocalStorageService', 'UserService', 'Team', 'UserIconService'];

function AdminUserBulkController($scope, $filter, $routeParams, $location, $q, LocalStorageService, UserService, Team, UserIconService) {
  var requiredFields = ['username', 'displayname', 'password'];

  $scope.token = LocalStorageService.getToken();
  $scope.roles = [];
  $scope.team = {};
  $scope.role = {};
  $scope.edit = {};
  $scope.import = {};
  $scope.results = {};
  $scope.errors = [];
  $scope.columnMap = {};
  $scope.unmappedFields = [];
  $scope.newUsers = [];

  UserService.getRoles().success(function (roles) {
    $scope.roles = roles;
  });

  Team.query(function(teams) {
    $scope.teams = _.reject(teams, function(team) { return team.teamEventId; });
  });

  $scope.importFile = function() {
    Papa.parse(event.target.files[0], {
      complete: function(results) {
        $scope.$apply(function() {
          $scope.columns = results.data[0];
          $scope.users = results.data.slice(1);
          _.each($scope.users, function(user) {
            user.team = {
              selected: $scope.team.selected
            };
            user.role = $scope.role.selected;
          });

          mapColumns($scope.columns);
        });
      }
    });
  };

  $scope.numberOfUsersToImport = function() {
    return $scope.users.length - Object.keys($scope.results).length + $scope.errors.length;
  };

  $scope.numberOfUsersImported = function() {
    return Object.keys($scope.results).length - $scope.errors.length;
  };

  $scope.mapColumn = function(name, columnIndex) {
    var mappedKey = _.findKey($scope.columnMap, function(index) {
      return columnIndex === index;
    });
    if (mappedKey) {
      delete $scope.columnMap[mappedKey];
    }

    $scope.columnMap[name] = columnIndex;
    validateMapping();
  };

  $scope.import = function () {
    $scope.imported = true;

    var imports = _.map($scope.users, function(user, index) {
      return {
        index: index,
        team: user.team.selected,
        user: {
          username: user[$scope.columnMap.username],
          displayName: user[$scope.columnMap.displayname],
          email: user[$scope.columnMap.email],
          phone: user[$scope.columnMap.phone],
          password: user[$scope.columnMap.password],
          passwordconfirm: user[$scope.columnMap.password],
          iconInitials: user[$scope.columnMap.iconInitials],
          iconColor: user[$scope.columnMap.iconColor],
          roleId: user.role.id
        }
      };
    });

    createUsers(imports);
  };

  $scope.retry = function() {
    var imports = _.map($scope.errors, function(error) {
      return {
        index: error.index,
        team: error.user.team.selected,
        user: {
          username: error.user[$scope.columnMap.username],
          displayName: error.user[$scope.columnMap.displayname],
          email:error.user[$scope.columnMap.email],
          phone: error.user[$scope.columnMap.phone],
          password: error.user[$scope.columnMap.password],
          passwordconfirm: error.user[$scope.columnMap.password],
          roleId: error.user.role.id
        }
      };
    });

    createUsers(imports);
  };

  function createUsers(imports) {
    $scope.importing = true;
    asyncSeries(imports).then(function() {
      $scope.importing = false;

      var errors = [];
      _.each($scope.results, function(result, index) {
        if (result.status !== 200) {
          errors.push({
            index: index,
            user: $scope.users[index]
          });
        }
      });

      $scope.errors = errors;
    });
  }

  function importUser(results, user) {
    var deferred = $q.defer();

    var canvas = document.createElement("canvas");
    canvas.height = 44;
    canvas.width = 44;

    if (user.user.iconInitials && user.user.iconColor && canvas.getContext) {
      var iconColor = user.user.iconColor;
      var iconInitials = user.user.iconInitials.substring(0, 2);
      UserIconService.drawMarker(canvas, iconColor, iconInitials);
      user.user.icon = UserIconService.canvasToPng(canvas);
      user.user.iconMetadata = JSON.stringify({
        type: 'create',
        text: iconInitials,
        color: iconColor
      });
    }

    UserService.createUser(user.user, function(newUser) {
      Team.addUser({id: user.team.id}, newUser, function() {
        $scope.results[user.index] = {
          data: newUser,
          status: 200
        };

        deferred.resolve(results);
      }, function(response) {
        $scope.results[user.index] = {
          status: response.status,
          message: response.responseText
        };

        deferred.resolve(results);
      });
    }, function(result) {
      $scope.results[user.index] = {
        status: result.status,
        message: result.responseText
      };
      deferred.resolve(results);
    });

    return deferred.promise;
  }

  function asyncSeries(arr) {
    return arr.reduce(function (promise, item) {
      return promise.then(function(result) {
        return importUser(result, item);
      });
    }, $q.when());
  }

  function mapColumns(columnNames) {
    var map = {};

    var usernameIndex = _.indexOf(columnNames, 'username');
    if (usernameIndex !== -1) map.username = usernameIndex;

    var displayNameIndex = _.indexOf(columnNames, 'displayname');
    if (displayNameIndex !== -1) map.displayname = displayNameIndex;

    var emailIndex = _.indexOf(columnNames, 'email');
    if (emailIndex !== -1) map.email = emailIndex;

    var phoneIndex = _.indexOf(columnNames, 'phone');
    if (phoneIndex !== -1) map.phone = phoneIndex;

    var passwordIndex = _.indexOf(columnNames, 'password');
    if (passwordIndex !== -1) map.password = passwordIndex;

    var iconInitialsIndex = _.indexOf(columnNames, 'iconInitials');
    if (iconInitialsIndex !== -1) map.iconInitials = iconInitialsIndex;

    var iconColorIndex = _.indexOf(columnNames, 'iconColor');
    if (iconColorIndex !== -1) map.iconColor = iconColorIndex;

    $scope.columnMap = map;
    validateMapping();
  }

  function validateMapping () {
    $scope.unmappedFields = _.difference(requiredFields, _.intersection(_.allKeys($scope.columnMap), requiredFields));
  }
}
