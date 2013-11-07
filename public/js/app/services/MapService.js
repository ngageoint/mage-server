'use strict';

angular.module('mage.mapService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('MapService', ['appConstants', 'mageLib',
    function (appConstants, mageLib) {
      var functions = {};
      return functions;
    }])
.factory('DataService', [function() {
  var container = {
    locations: {},
    locationsLoaded: false
  };
  return container;
}]); // end of MapService

  /* Barela idea */
  /*
angular.module('mage.mapService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('MapService', ['appConstants', 'mageLib',
    function (appConstants, mageLib) {
      var ***REMOVED*** = {
        currentMapPanel: 'layers' // options are: layers, observation, export, or none
      };
      // now in your controller you can just access MapService.currentMapPanel.  The controller
      // will be able to watch that variable fine if you attach the ***REMOVED*** to a scope variable ie
      // $scope.mapService = MapService; (after injecting that of course)
      return ***REMOVED***;
    }]);
    */