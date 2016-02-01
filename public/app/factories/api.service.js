angular
	.module('mage')
	.factory('ApiService', ApiService);

ApiService.$inject = ['$resource'];

function ApiService($resource) {
  var Api = $resource('/api', {
    get: {
      method: 'GET',
      isArray: false
    }
  });

  return Api;
}
