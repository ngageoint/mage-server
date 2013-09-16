'use strict';

angular.module('mage.mapService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('MapService', ['appConstants', 'mageLib',
    function (appConstants, mageLib) {
      var functions = {};
      var currentMapPanel = "layers"; // options are: layers, observation, export, or none

      functions.getCurrentMapPanel = function () {
        console.log("Sending back the current map panel " + currentMapPanel);
        return currentMapPanel;
      };

      functions.setCurrentMapPanel = function (mapPanel) {
        currentMapPanel = mapPanel;
      };

      return functions;
    }]) // end of MapService