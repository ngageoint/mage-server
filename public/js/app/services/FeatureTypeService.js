'use strict';

angular.module('mage.featureTypeService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('FeatureTypeService', ['$http', 'appConstants', 'mageLib',
    function ($http, appConstants, mageLib) {
      var featureTypes = {};

      deviceService.getAllFeatureTypes = function () {
        return $http.get(appConstants.rootUrl + '/api/feature/types/', {params: mageLib.getTokenParams()});
      };

      return featureTypes;
    }]);