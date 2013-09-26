'use strict';

mage.factory('FeatureTypeService', ['$http', 'appConstants', 'mageLib',
    function ($http, appConstants, mageLib) {
      var ***REMOVED*** = {};

      var types = $http.get(appConstants.rootUrl + '/api/feature/types/', {params: mageLib.getTokenParams()});
      ***REMOVED***.getTypes = function () {
        return types;
      };

      return ***REMOVED***;
    }]);