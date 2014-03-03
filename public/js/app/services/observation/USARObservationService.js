'use strict';

angular.module('mage')
  .factory('USARObservationService', ['appConstants', 'FeatureTypeService', 'Feature', 'UserService',
    function (appConstants, FeatureTypeService, Feature, UserService) {
      var ***REMOVED*** = {};

      ***REMOVED***.teams = [
        'AZ-TF1',
        'CA-TF1',
        'CA-TF2',
        'CA-TF3',
        'CA-TF4',
        'CA-TF5',
        'CA-TF6',
        'CA-TF7',
        'CA-TF8',
        'CO-TF1',
        'FL-TF1',
        'FL-TF2',
        'IN-TF1',
        'MA-TF1',
        'MD-TF1',
        'MO-TF1',
        'NE-TF1',
        'NM-TF1',
        'NV-TF1',
        'NY-TF1',
        'OH-TF1',
        'PA-TF1',
        'TN-TF1',
        'TX-TF1',
        'UT-TF1',
        'VA-TF1',
        'VA-TF2',
        'WA-TF1',
        'OTHER'
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
      ***REMOVED***.observationTemplate = '/js/app/partials/***REMOVED***/observation.html';

      return ***REMOVED***;
    }
  ]
);