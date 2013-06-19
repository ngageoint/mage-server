'use strict';

angular.module('sage.userService', ['ngResource', 'sage.***REMOVED***s'])
  .factory('User', ['$resource, appConstants',
    function($resource) {
      var resource =
        $resource(appConstants.rootUrl + ':port/users/:id', { // may need to alter this to have :port after the url, would then need to add port below the same way that :id is handled.
          id:'@id'
          }, {
            update: {method: 'PUT'}
          });
      return resource;
    }])