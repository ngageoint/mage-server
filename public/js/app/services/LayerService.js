'use strict';

angular.module('mage.layerService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('LayerService', ['$http', 'appConstants', 'mageLib',
    function ($http, appConstants, mageLib) {
      var ***REMOVED*** = {};

      ***REMOVED***.getAllLayers = function () {
        return $http.get(appConstants.rootUrl + '/api/layers/');
      };

      ***REMOVED***.createLayer = function(layer) {
        return $http.post(
          appConstants.rootUrl + '/api/layers', 
          layer, 
          {headers: {"Content-Type": "application/json"}}
        );
      };

      ***REMOVED***.updateLayer = function(layer) {
        return $http.put(
          appConstants.rootUrl + '/api/layers/' + layer.id, 
          layer, 
          {headers: {"Content-Type": "application/json"}}
        );
      };

      return ***REMOVED***;

    }]);