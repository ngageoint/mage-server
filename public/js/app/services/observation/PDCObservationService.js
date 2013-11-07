'use strict';

angular.module('mage')
  .factory('PDCObservationService', ['appConstants', 'FeatureTypeService', 'Feature', 'UserService',
    function (appConstants, FeatureTypeService, Feature, UserService) {
      var ***REMOVED*** = {};

      ***REMOVED***.teams = [
        'Coastal Cluster',
        'Coastal Olympic Village',
        'Mountain Cluster',
        'Mountain Olympic Village',
        'Mountain Endurance',
        'ISEG JOC'
      ];
      ***REMOVED***.levels = [{
        name: 'None',
        color: 'blue'
      },{
        name: 'Low',
        color: 'green'
      },{
        name: 'Medium',
        color: 'yellow'
      },{
        name: 'High',
        color: 'red'
      }];

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
            EVENTLEVEL: ***REMOVED***.levels[0].name,
            TEAM: ***REMOVED***.teams[0],
            EVENTDATE: new Date()
          }
        });
      };
      ***REMOVED***.observationTemplate = '/js/app/partials/pdc/observation.html';

      return ***REMOVED***;
    }
  ]
);