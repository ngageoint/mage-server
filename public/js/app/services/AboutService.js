'use strict';

angular.module('mage.aboutService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('AboutService', ['$http', 'appConstants',
    function ($http, appConstants) {
      var ***REMOVED*** = {};

      ***REMOVED***.about = function () {
        return $http.get(appConstants.rootUrl + '/api/');
      };

      return ***REMOVED***;

    }]);