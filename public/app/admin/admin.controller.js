angular
  .module('mage')
  .controller('AdminController', AdminController);

AdminController.$inject = ['$scope', '$routeParams', '$location', '$filter', 'UserService', 'DeviceService', 'Team', 'Event', 'Layer'];

function AdminController($scope, $routeParams, $location, $filter, UserService, DeviceService, Team, Event, Layer) {
  $scope.currentAdminPanel = $routeParams.adminPanel || "";

  $scope.usersPerPage = 10;
  $scope.usersPage = 0;
  $scope.inactiveUsers = [];

  $scope.devicesPerPage = 10;
  $scope.devicesPage = 0;
  $scope.unregisteredDevices = [];

  UserService.getUserCount().success(function (data) {
    $scope.userCount = data.count;
  });

  UserService.getInactiveUsers().success(function(data) {
    $scope.inactiveUsers = data;
  });

  DeviceService.count().success(function (data) {
    $scope.deviceCount = data.count;
  });

  DeviceService.getAllDevices({expand: 'user', registered: false}).success(function(data) {
    $scope.unregisteredDevices = data;
  });

  Team.count(function (data) {
    $scope.teamCount = data.count;
  });

  Event.count(function (data) {
    $scope.eventCount = data.count;
  });

  Layer.count(function (data) {
    $scope.layerCount = data.count;
  });

  $scope.newUser = function() {
    $location.path('/admin/users/new');
  }

  $scope.activateUser = function($event, user) {
    $event.stopPropagation();

    user.active = true;
    UserService.updateUser(user.id, user, function(data) {
      $scope.inactiveUsers = _.reject($scope.inactiveUsers, function(u) { return u.id == data.id});
    }, function(response) {
    });
  }

  $scope.gotoUser = function(user) {
    $location.path('/admin/users/' + user.id)
  }

  $scope.newTeam = function() {
    $location.path('/admin/teams/new');
  }

  $scope.newEvent = function() {
    $location.path('/admin/events/new');
  }

  $scope.newDevice = function() {
    $location.path('/admin/devices/new');
  }

  $scope.registerDevice = function($event, device) {
    $event.stopPropagation();

    device.registered = true;
    DeviceService.updateDevice(device).success(function(data) {
      $scope.unregisteredDevices = _.reject($scope.unregisteredDevices, function(d) { return d.id == data.id});
    }, function(response) {
    });
  }

  $scope.gotoDevice = function(device) {
    $location.path('/admin/devices/' + device.id)
  }

  $scope.filterDevices = function(device) {
    var filteredDevices = $filter('filter')([device], $scope.deviceSearch);
    return filteredDevices && filteredDevices.length;
  }

  $scope.newLayer = function() {
    $location.path('/admin/layers/new');
  }

}
