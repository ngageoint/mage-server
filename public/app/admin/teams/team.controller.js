angular
  .module('mage')
  .controller('AdminTeamController', AdminTeamController);

AdminTeamController.$inject = ['$scope', '$uibModal', '$filter', '$location', '$routeParams', 'Team', 'Event', 'UserService'];

function AdminTeamController($scope, $uibModal, $filter, $location, $routeParams, Team, Event, UserService) {
  var permissions = [];

  $scope.edit = false;
  $scope.usersPage = 0;
  $scope.usersPerPage = 10;

  $scope.teamEvents = [];
  $scope.nonTeamEvents = [];
  $scope.eventsPage = 0;
  $scope.eventsPerPage = 10;

  $scope.team = {
    users: []
  };

  UserService.getAllUsers({forceRefresh: true}).success(function(users) {
    $scope.users = users;
    $scope.usersIdMap = _.indexBy(users, 'id');

    Team.get({id: $routeParams.teamId}, function(team) {
      $scope.team = team;
      $scope.user = {};
      $scope.teamUsersById = _.indexBy($scope.team.users, 'id');
      $scope.nonUsers = _.filter($scope.users, function(user) {
        return !$scope.teamUsersById[user.id];
      });

      var myAccess = _.find($scope.team.acl, function(access) {
        return access.userId === UserService.myself.id;
      });
      var aclPermissions = myAccess ? myAccess.permissions : [];

      $scope.hasReadPermission = _.contains(UserService.myself.role.permissions, 'READ_TEAM') || _.contains(aclPermissions, 'read');
      $scope.hasUpdatePermission = _.contains(UserService.myself.role.permissions, 'UPDATE_TEAM') || _.contains(aclPermissions, 'update');
      $scope.hasDeletePermission = _.contains(UserService.myself.role.permissions, 'DELETE_TEAM') || _.contains(aclPermissions, 'delete');
    });

    Event.query(function(events) {
      $scope.event = {};
      $scope.teamEvents = _.filter(events, function(event) {
        return _.some(event.teams, function(team) {
          return $scope.team.id === team.id;
        });
      });

      $scope.nonTeamEvents = _.reject(events, function(event) {
        return _.some(event.teams, function(team) {
          return $scope.team.id === team.id;
        });
      });
    });

  });

  $scope.editTeam = function(team) {
    $location.path('/admin/teams/' + team.id + '/edit');
  };

  $scope.addUser = function(user) {
    $scope.user = {};
    $scope.team.users.push(user);
    $scope.nonUsers = _.reject($scope.nonUsers, function(u) { return user.id === u.id; });

    saveTeam($scope.team);
  };

  $scope.removeUser = function(user) {
    $scope.nonUsers.push(user);
    $scope.team.users = _.reject($scope.team.users, function(u) { return user.id === u.id; });

    saveTeam($scope.teams);
  };

  $scope.filterEvents = function(event) {
    var filteredEvents = $filter('filter')([event], $scope.eventSearch);
    return filteredEvents && filteredEvents.length;
  };

  function saveTeam() {
    $scope.team.$save();
  }

  $scope.hasPermission = function(permission) {
    return _.contains(permissions, permission);
  };

  $scope.editAccess= function(team) {
    $location.path('/admin/teams/' + team.id + '/access');
  };

  $scope.gotoEvent = function(event) {
    $location.path('/admin/events/' + event.id);
  };

  $scope.gotoUser = function(user) {
    $location.path('/admin/users/' + user.id);
  };

  $scope.addEventToTeam = function(event) {
    Event.addTeam({id: event.id}, $scope.team, function(event) {
      $scope.teamEvents.push(event);
      $scope.nonTeamEvents = _.reject($scope.nonTeamEvents, function(e) { return e.id === event.id; });

      $scope.event = {};
    });
  };

  $scope.removeEventFromTeam = function($event, event) {
    $event.stopPropagation();

    Event.removeTeam({id: event.id, teamId: $scope.team.id}, function(event) {
      $scope.teamEvents = _.reject($scope.teamEvents, function(e) { return e.id === event.id; });
      $scope.nonTeamEvents.push(event);
    });
  };

  $scope.deleteTeam = function() {
    var modalInstance = $uibModal.open({
      templateUrl: '/app/admin/teams/team-delete.html',
      resolve: {
        team: function () {
          return $scope.team;
        }
      },
      controller: "AdminTeamDeleteController"
    });

    modalInstance.result.then(function () {
      $location.path('/admin/teams');
    });
  };
}
