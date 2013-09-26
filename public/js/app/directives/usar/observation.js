'use strict';

mage.directive('***REMOVED***Observation', ['FeatureTypeService', 'UserService', function (FeatureTypeService, UserService) {
  return {
    restrict: "A",
    templateUrl: "/js/app/partials/***REMOVED***/observation.html",
    controller: "FeatureController",
    link: function(scope) {
      scope.teams = [
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
      scope.levels = [
        'Normal', 
        'Yellow', 
        'Red'
      ];

      //Get the Feature Types
      FeatureTypeService.getTypes().
        success(function (types, status, headers, config) {
          scope.types = types;
        }).
        error(function (data, status, headers, config) {
          console.log("Error getting types: " + status);
        });


      scope.createNewObservation = function(location) {
        return {
          attributes: {
            userId: UserService.myself._id,
            TYPE: scope.types[0].name,
            EVENTLEVEL: scope.levels[0],
            TEAM: scope.teams[0],
            EVENTDATE: new Date()
          }
        };
      }
    }
  };
}]);