'use strict';

angular.module('mage')
  .factory('TomnodObservationService', ['appConstants', 'FeatureTypeService', 'Feature', 'UserService',
    function (appConstants, FeatureTypeService, Feature, UserService) {
      var ***REMOVED*** = {};

      FeatureTypeService.getTypes().
        success(function (types, status, headers, config) {
          ***REMOVED***.types = types;
        }).
        error(function (data, status, headers, config) {
          console.log("Error getting types: " + status);
        });

      ***REMOVED***.createNewObservation = function(location) {
        return new Feature({
          type: 'Feature',
          geometry: {
            type: 'Point'
          },
          properties: {
            userId: UserService.myself._id,
            type: ***REMOVED***.types[0].name,
            timestamp: new Date()
          }
        });
      };
      ***REMOVED***.observationTemplate = '/js/app/partials/tomnod/observation.html';

      return ***REMOVED***;
    }
  ]
);