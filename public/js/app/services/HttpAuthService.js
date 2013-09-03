'use strict';

angular.module('mage.httpAuthService', [])
  .factory('HttpAuthService', ['$q', '$location', '$injector', '$rootScope',
    function ($q, $location, $injector, $rootScope) {
		return function(promise) {
	        return promise.then(function(response) {
	          return response;
	        }, function(response) {
	          if (response.status == 401 && $location.path() != '/signup' && $location.path() != '/' && $location.path() != '/signin') {
	          	// must do this like this so there will not be a circular dependency
	            $injector.get('UserService').clearUser();
	            $location.path('/');
	          }
	          return $q.reject(response);
	        });
        }
    }
]);