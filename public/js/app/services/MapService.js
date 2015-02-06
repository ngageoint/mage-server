'use strict';

angular.module('mage.mapService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('MapService', ['appConstants', 'mageLib', '$rootScope',
    function (appConstants, mageLib, rootScope) {
      var functions = {
      };

      functions.updateLeafletLayer = function(url, options) {
          functions.leafletBaseLayerUrl = url;
          functions.leafletBaseLayerOptions = options;
          rootScope.$emit('leafletLayerChanged');
        };

      return functions;
    }])
.factory('DataService', [function() {
  var container = {
    locations: {},
    locationsLoaded: false
  };
  
  return container;
}]);
