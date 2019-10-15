var _ = require('underscore')
  , Papa = require('papaparse');

module.exports = AdminUserBulkController;

AdminUserBulkController.$inject = ['$scope', '$filter', '$routeParams', '$location', '$q', '$timeout', 'LocalStorageService', 'UserService', 'Team', 'UserIconService'];

function AdminUserBulkController($scope, $filter, $routeParams, $location, $q, $timeout, LocalStorageService, UserService, Team, UserIconService) {
  var requiredFields = ['username', 'displayname', 'password'];

  $scope.token = LocalStorageService.getToken();

  $scope.columnOptions = [{
    value: 'username',
    title: 'Username'
  },{
    value: 'displayname',
    title: 'Display Name'
  },{
    value: 'email',
    title: 'Email'
  },{
    value: 'phone',
    title: 'Phone Number'
  },{
    value: 'password',
    title: 'Password'
  },{
    value: 'iconInitials',
    title: 'Icon Initials'
  },{
    value: 'iconolor',
    title: 'Icon Color'
  }];

  $scope.team = { selected: null };
  $scope.role = { selected: null };

  $scope.edit = {};
  $scope.columnMap = {};
  $scope.unmappedFields = [];

  $scope.someError = {};

  UserService.getRoles().success(function (roles) {
    $scope.roles = roles;
  });

  Team.query(function(teams) {
    $scope.teams = _.reject(teams, function(team) { return team.teamEventId; });
  });

  $scope.teamSelected = function(team) {
    $scope.team.selected = team;
  };

  $scope.roleSelected = function(role) {
    $scope.role.selected = role;
  };

  $scope.teamSelectedForUser = function(team, user) {
    user.team.selected = team;
  };

  $scope.roleSelectedForUser = function(role, user) {
    user.role.selected = role;
  };

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
            user.role = {
              selected: $scope.role.selected
            };
          });

          mapColumns($scope.columns);
        });
      }
    });
  };

  $scope.onStatusClosed = function() {
    $scope.importStatus = null;
  };

  $scope.onColumnOption = function($event, $index) {
    mapColumn($event.option.value, $index);
    validateMapping();
  };

  $scope.selected = function($index) {
    for (let [key, value] of Object.entries($scope.columnMap)) {
      if (value === $index) return key;
    }
  };

  $scope.import = function () {
    $scope.imported = true;
    importUsers($scope.users);
  };

  function importUsers(users) {
    $scope.importing = true;
    $scope.edit.row = null;
    asyncSeries(users).then(function() {
      $scope.importing = false;

      $scope.users = $scope.users.filter(user => {
        return user.result.status !== 200;
      });

      if ($scope.users.length) {
        $scope.importStatus = {
          message: `${$scope.users.length} users failed to import, please fix errors and try again.`,
          dismiss: true
        };
      } else {
        $scope.importStatus = {
          message: `All users successfully imported.`,
          dismiss: true
        };

        $scope.columns = null;
        $scope.team = { selected: null };
        $scope.role = { selected: null };
      }
    });
  }

  function importUser(row) {
    var deferred = $q.defer();

    var user = {
      username: row[$scope.columnMap.username],
      displayName: row[$scope.columnMap.displayname],
      email: row[$scope.columnMap.email],
      phone: row[$scope.columnMap.phone],
      password: row[$scope.columnMap.password],
      passwordconfirm: row[$scope.columnMap.password],
      iconInitials: row[$scope.columnMap.iconInitials],
      iconColor: row[$scope.columnMap.iconColor],
      roleId: row.role.selected.id
    };

    var canvas = document.createElement("canvas");
    canvas.height = 44;
    canvas.width = 44;

    if (user.iconInitials && user.iconColor && canvas.getContext) {
      var iconColor = user.iconColor;
      var iconInitials = user.iconInitials.substring(0, 2);
      UserIconService.drawMarker(canvas, iconColor, iconInitials);
      user.icon = UserIconService.canvasToPng(canvas);
      user.iconMetadata = JSON.stringify({
        type: 'create',
        text: iconInitials,
        color: iconColor
      });
    }

    UserService.createUser(user, function(newUser) {
      Team.addUser({id: row.team.selected.id}, newUser, function() {
        row.result = {
          status: 200
        };

        deferred.resolve();
      }, function(response) {
        row.result = {
          status: response.status,
          message: `Could not create user, ${response.responseText}`
        };

        deferred.resolve();
      });
    }, function(result) {
      row.result = {
        status: result.status,
        message: `Could not create user, ${result.responseText}`
      };
      deferred.resolve();
    });

    return deferred.promise;
  }

  function asyncSeries(users) {
    return users.reduce(function (promise, user) {
      return promise.then(function() {
        return importUser(user);
      });
    }, $q.when());
  }

  function mapColumn(column, index) {
    var mappedKey = _.findKey($scope.columnMap, function(i) {
      return index === i;
    });

    if (mappedKey) {
      delete $scope.columnMap[mappedKey];
    }

    $scope.columnMap[column] = index;
  }

  function mapColumns(columnNames) {
    var usernameIndex = _.indexOf(columnNames, 'username');
    if (usernameIndex !== -1) mapColumn('username', usernameIndex);

    var displayNameIndex = _.indexOf(columnNames, 'displayname');
    if (displayNameIndex !== -1) mapColumn('displayname', displayNameIndex);

    var emailIndex = _.indexOf(columnNames, 'email');
    if (emailIndex !== -1) mapColumn('email', emailIndex);

    var phoneIndex = _.indexOf(columnNames, 'phone');
    if (phoneIndex !== -1) mapColumn('phone', phoneIndex);

    var passwordIndex = _.indexOf(columnNames, 'password');
    if (passwordIndex !== -1) mapColumn('password', passwordIndex);

    var iconInitialsIndex = _.indexOf(columnNames, 'iconInitials');
    if (iconInitialsIndex !== -1) mapColumn('iconInitials', iconInitialsIndex);

    var iconColorIndex = _.indexOf(columnNames, 'iconColor');
    if (iconColorIndex !== -1) mapColumn('iconColor', iconColorIndex);

    validateMapping();
  }

  function validateMapping () {
    var fields = _.difference(requiredFields, _.intersection(_.allKeys($scope.columnMap), requiredFields));
    $scope.unmappedFields = _.filter($scope.columnOptions, field => { return fields.includes(field.value); });
  }
}
