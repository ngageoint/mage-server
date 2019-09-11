var _ = require('underscore')
  , moment = require('moment');

module.exports = AdminDeviceController;

AdminDeviceController.$inject = ['$scope', '$uibModal', '$routeParams', '$location', 'LocalStorageService', 'DeviceService', 'UserService', 'LoginService'];

function AdminDeviceController($scope, $uibModal, $routeParams, $location, LocalStorageService, DeviceService, UserService, LoginService) {
  $scope.token = LocalStorageService.getToken();

  $scope.hasDeviceEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_DEVICE');
  $scope.hasDeviceDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_DEVICE');

  var filter = {
    device: {id: $routeParams.deviceId}
  };

  $scope.user = {};
  $scope.login = {
    startDateOpened: false,
    endDateOpened: false
  };

  var firstLogin = null;
  $scope.showPrevious = false;
  $scope.showNext = true;

  DeviceService.getDevice($routeParams.deviceId).then(function(device) {
    $scope.device = device;
  });

  LoginService.query({filter: filter, limit: $scope.loginResultsLimit}).success(function(loginPage) {
    $scope.loginPage = loginPage;
    if (loginPage.logins.length) {
      firstLogin = loginPage.logins[0];
    }
  });

  $scope.iconClass = function(device) {
    if (!device) return;

    if (device.iconClass) return device.iconClass;

    var userAgent = device.userAgent || "";

    if (device.appVersion === 'Web Client') {
      device.iconClass = 'fa-desktop admin-desktop-icon';
    } else if (userAgent.toLowerCase().indexOf("android") !== -1) {
      device.iconClass = 'fa-android admin-android-icon';
    } else if(userAgent.toLowerCase().indexOf("ios") !== -1) {
      device.iconClass = 'fa-apple admin-apple-icon';
    } else {
      device.iconClass = 'fa-mobile admin-generic-icon';
    }

    return device.iconClass;
  };

  $scope.editDevice = function(device) {
    $location.path('/admin/devices/' + device.id + '/edit');
  };

  $scope.gotoUser = function(user) {
    $location.path('/admin/users/' + user.id);
  };

  $scope.deleteDevice = function(device) {
    var modalInstance = $uibModal.open({
      template: require('./device-delete.html'),
      resolve: {
        device: function () {
          return device;
        }
      },
      controller: ['$scope', '$uibModalInstance', 'device', function ($scope, $uibModalInstance, device) {
        $scope.device = device;

        $scope.deleteDevice = function(device) {
          DeviceService.deleteDevice(device).then(function() {
            $uibModalInstance.close(device);
          });
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function() {
      $location.path('/admin/devices');
    });
  };

  $scope.registerDevice = function (device) {
    device.registered = true;
    DeviceService.updateDevice(device).then(function() {
      $scope.$broadcast('device:registered', device);
    });
  };

  $scope.unregisterDevice = function (device) {
    device.registered = false;
    DeviceService.updateDevice(device).then(function() {
      $scope.$broadcast('device:unregistered', device);
    });
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
    filter.user = $scope.user.selected;
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
