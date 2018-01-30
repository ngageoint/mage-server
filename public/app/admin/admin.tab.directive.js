angular
  .module('mage')
  .directive('adminTab', adminTab);

function adminTab() {
  var directive = {
    restrict: "A",
    templateUrl: 'app/admin/admin.tab.html',
    replace: true,
    scope: {
      tab: '=adminTab'
    },
    controller: AdminTabController
  };

  return directive;
}

AdminTabController.$inject = ['$scope', '$location', 'UserService', 'DeviceService'];

function AdminTabController($scope, $location, UserService, DeviceService) {
  $scope.hasPermission = function(permission) {
    return _.contains(UserService.myself.role.permissions, permission);
  };

  $scope.onTabChanged = function(tab) {
    $location.path('/admin' + tab);
  };

  UserService.getAllUsers().then(function(users) {
    $scope.inactiveUsers = _.filter(users, function(user) {
      return !user.active;
    });
  });

  DeviceService.getAllDevices().then(function(devices) {
    $scope.unregisteredDevices = _.filter(devices, function(device) {
      return !device.registered;
    });
  });

  $scope.$on('user:activated', function(e, user) {
    $scope.inactiveUsers = _.filter($scope.inactiveUsers, function(inactiveUser) {
      return inactiveUser.id !== user.id;
    });
  });

  $scope.$on('user:inactivated', function(e, user) {
    $scope.inactiveUsers.push(user);
  });

  $scope.$on('device:registered', function(e, device) {
    $scope.unregisteredDevices = _.filter($scope.unregisteredDevices, function(unregisteredDevice) {
      return unregisteredDevice.id !== device.id;
    });
  });

  $scope.$on('device:unregistered', function(e, device) {
    $scope.unregisteredDevices.push(device);
  });
}
