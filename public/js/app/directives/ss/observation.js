'use strict';

mage.directive('ssObservation', ['FeatureTypeService', 'UserService' , 'Feature', function (FeatureTypeService, UserService, Feature) {

  return {
    restrict: "A",
    templateUrl: "/js/app/partials/ss/observation.html",
    controller: "FeatureController",
    link: function(scope) {

      scope.teams = [
        'PI ZONE A',
        'PI ZONE B',
        'PI ZONE C',
        'PI ZONE D'
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
        return new Feature({
          type: 'Feature',
          geometry: {},
          properties: {
            userId: UserService.myself._id,
            TYPE: scope.types[0].name,
            TEAM: scope.teams[0],
            EVENTDATE: new Date()
          }
        });
      }
    }
  };
}]);