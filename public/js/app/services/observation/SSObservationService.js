'use strict';

angular.module('mage')
  .factory('SSObservationService', ['appConstants', 'FeatureTypeService', 'Feature', 'UserService',
    function (appConstants, FeatureTypeService, Feature, UserService) {
      var ***REMOVED*** = {};

      ***REMOVED***.teams = [
        'PI ZONE A',
        'PI ZONE B',
        'PI ZONE C',
        'PI ZONE D'
      ];

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
            TYPE: ***REMOVED***.types[0].name,
            TEAM: ***REMOVED***.teams[0],
            EVENTDATE: new Date()
          }
        });
      };
      ***REMOVED***.observationTemplate = '/js/app/partials/ss/observation.html';

      return ***REMOVED***;
    }
  ]
);