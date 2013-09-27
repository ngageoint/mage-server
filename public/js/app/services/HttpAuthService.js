'use strict';

angular.module('mage.httpAuthService', [])
  .factory('HttpAuthService', ['$q', '$location', '$injector', '$rootScope', 
    function ($q, $location, $injector, $rootScope) {
    	return {
      // On request success
      request: function (config) {
      	console.info('request', config);
        // console.log(config); // Contains the data about the request before it is sent.
 
        // Return the config or wrap it in a promise if blank.
        return config || $q.when(config);
      },
 
      // On request failure
      requestError: function (rejection) {
      	console.info('request error');
        // console.log(rejection); // Contains the data about the error on the request.
        
        // Return the promise rejection.
        return $q.reject(rejection);
      },
 
      // On response success
      response: function (response) {
      	console.info('response ' + response.status);
      	$rootScope.tokenExpired = false;
        // console.log(response); // Contains the data from the response.
        
        // Return the response or promise.
        return response || $q.when(response);
      },
 
      // On response failture
      responseError: function (rejection) {
      	console.info('response error', rejection);
      	if (rejection.status == 401 && $location.path() != '/signup' && $location.path() != '/' && $location.path() != '/signin') {
      		$injector.get('UserService').clearUser();
      		$rootScope.tokenExpired = true;
          var modalInstance = $injector.get('$modal').open({
            templateUrl: 'myModalContent.html',
            controller: ModalInstanceCtrl
          });

          modalInstance.result.then(function (theScope) {
            console.info('the scope ', theScope);
            //$scope.selected = selectedItem;
          }, function () {
            $log.info('Modal dismissed at: ' + new Date());
          });
      		//$q.when(rejection);
      		return;
            //$location.path('/');
        }
        // console.log(rejection); // Contains the data about the error.
        
        // Return the promise rejection.
        return $q.reject(rejection);
      }
    };
    /*
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
        }*/
    }
]);