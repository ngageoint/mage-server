'use strict';

angular.module('mage.userService', ['ngResource', 'mage.***REMOVED***s'])
  .factory('UserService', ['$resource', 'appConstants',
    function($resource, appConstants) {

      var user =
        $resource(appConstants.rootUrl + '\::port/api/users/:id', { // may need to alter this to have :port after the url, would then need to add port below the same way that :id is handled.
          id:'@id',
          port: '4242',
          }, {
            update: {method: 'PUT'},
            newUser : {
              method : 'POST',
              headers : {'Content-Type': 'application/x-www-form-urlencoded'},
            }
          });
      return {user:user};
    }])