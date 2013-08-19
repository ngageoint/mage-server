'use strict';

function AboutController ($scope, AboutService) {
  AboutService.about()
  	.success(function(data) {
  		$scope.name = data.name;
  		$scope.serverVersion = data.version;
  		$scope.locationServices= data.locationServices ? 'enabled' : 'disabled';
  		$scope.deviceProvisioning = data.deviceProvisioning ? 'enabled' : 'disabled';
  		$scope.apk = data.apk
  	});

}