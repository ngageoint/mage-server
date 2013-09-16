mage.directive('deviceId', function(DeviceService) {
  return {
    restrict: "A",
    scope: {
    	deviceId: '='
    },
    controller: function ($scope, DeviceService) {
      $scope.$watch("deviceId", function(deviceId) {
        if (!deviceId) return;

        console.log('trying to get device with id: ' + deviceId);
        DeviceService.getDevice(deviceId)
          .then(function(device) {
            $scope.device = device.data || device;
          });
        }
      );
    }
  };
});