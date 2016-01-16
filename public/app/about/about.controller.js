angular
  .module('mage')
  .controller('AboutController', AboutController);

AboutController.$inject = ['$scope', 'ApiService'];

function AboutController ($scope, ApiService) {

  ApiService.get(function(data) {
		$scope.name = data.name;
		$scope.serverVersion = data.version;
		$scope.locationServices= data.locationServices ? 'enabled' : 'disabled';
		$scope.deviceProvisioning = data.provision ? 'enabled' : 'disabled';
		$scope.apk = data.apk
	});
}
