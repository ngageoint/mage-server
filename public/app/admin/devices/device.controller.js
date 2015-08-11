angular
  .module('mage')
  .controller('AdminDeviceController', AdminDeviceController);

AdminDeviceController.$inject = ['$scope', '$injector', '$filter', '$routeParams', '$location', 'LocalStorageService', 'DeviceService', 'UserService', 'LoginService'];

function AdminDeviceController($scope, $injector, $filter, $routeParams, $location, LocalStorageService, DeviceService, UserService, LoginService) {
  $scope.token = LocalStorageService.getToken();

  var filter = {
    device: {id: $routeParams.deviceId}
  }
  $scope.user = {};
  $scope.login = {
    startDateOpened: false,
    endDateOpened: false
  };
  var firstLogin = null;
  $scope.showPrevious = false;
  $scope.showNext = true;

  DeviceService.getDevice($routeParams.deviceId).then(function(device) {
    $scope.device = device.data;
  });

  UserService.getAllUsers().success(function (users) {
    $scope.users = users;
  });

  LoginService.query({filter: filter, limit: $scope.loginResultsLimit}).success(function(loginPage) {
    $scope.loginPage = loginPage;
    if (loginPage.logins.length) {
      firstLogin = loginPage.logins[0];
    }
  });

  $scope.userIdMap = {};
  $scope.$watch('users', function(users) {
    $scope.userIdMap = _.indexBy(users, 'id');
  });

  $scope.editDevice = function(device) {
    $location.path('/admin/devices/' + device.id + '/edit');
  }

  $scope.gotoUser = function(user) {
    $location.path('/admin/users/' + user.id);
  }

  $scope.deleteDevice = function(device) {
    var modalInstance = $injector.get('$modal').open({
      templateUrl: '/app/admin/devices/device-delete.html',
      resolve: {
        device: function () {
          return device;
        }
      },
      controller: ['$scope', '$modalInstance', 'device', function ($scope, $modalInstance, device) {
        $scope.device = device;

        $scope.deleteDevice = function(device, force) {
          DeviceService.deleteDevice(device).success(function() {
            $modalInstance.close(device);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function(device) {
      $location.path('/admin/devices');
    });
  }

  $scope.registerDevice = function (device) {
    device.registered = true;
    DeviceService.updateDevice(device).success(function(data) {
    }, function(response) {
    });
  }

  $scope.unregisterDevice = function (device) {
    device.registered = false;
    DeviceService.updateDevice(device).success(function(data) {
    }, function(response) {
    });
  }

  $scope.pageLogin = function(url) {
    LoginService.query({url: url, filter: filter, limit: $scope.loginResultsLimit}).success(function(loginPage) {

      if (loginPage.logins.length) {
        $scope.loginPage = loginPage;
        $scope.showNext = loginPage.logins.length != 0;
        $scope.showPrevious = loginPage.logins[0].id != firstLogin.id;
      }
    });
  }

  $scope.filterLogins = function() {
    filter.user = $scope.user.selected;
    filter.startDate = $scope.login.startDate;
    if ($scope.login.endDate) {
      filter.endDate = moment($scope.login.endDate).endOf('day').toDate();
    }

    LoginService.query({filter: filter, limit: $scope.loginResultsLimit}).success(function(loginPage) {
      $scope.showNext = loginPage.logins.length != 0;
      $scope.showPrevious = false;
      $scope.loginPage = loginPage;
    });
  }

  $scope.openLoginStart = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.login.startDateOpened = true;
  }

  $scope.openLoginEnd = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.login.endDateOpened = true;
  }

  $scope.loginResultsLimitChanged = function() {
    $scope.filterLogins();
  }

  $scope.$watch('login.startDate', function(newDate, oldDate) {
    if (!newDate && !oldDate) return;

    $scope.filterLogins();
  });

  $scope.$watch('login.endDate', function(newDate, oldDate) {
    if (!newDate && !oldDate) return;

    $scope.filterLogins();
  });
}
