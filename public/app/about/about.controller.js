angular
  .module('mage')
  .controller('AboutController', AboutController);

AboutController.$inject = ['$scope', 'ApiService'];

function AboutController ($scope, ApiService) {

  ApiService.get(function(data) {
		$scope.name = data.name;
		$scope.serverVersion = data.version;
		$scope.apk = data.apk
	});
}
