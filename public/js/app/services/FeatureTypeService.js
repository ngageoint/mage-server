'use strict';

mage.factory('FeatureTypeService', ['$http', 'appConstants', 'mageLib',
    function ($http, appConstants, mageLib) {
      var ***REMOVED*** = {};

      ***REMOVED***.getAllFeatureTypes = function () {
        return $http.get(appConstants.rootUrl + '/api/feature/types/', {params: mageLib.getTokenParams()});
      };

      return ***REMOVED***;
    }]);