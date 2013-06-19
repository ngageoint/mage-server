'use strict';

angular.module('sage.userService', ['ngResource', 'sage.***REMOVED***s'])
  .factory('UserService', ['$resource', 'appConstants',
    function($resource, appConstants) {
      var user =
        $resource(appConstants.rootUrl + '\::port/api/users/:id', { // may need to alter this to have :port after the url, would then need to add port below the same way that :id is handled.
          id:'@id',
          port: '4242'
          }, {
            update: {method: 'PUT'}
          });
      return {user:user};
    }])