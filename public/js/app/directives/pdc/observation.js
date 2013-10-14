'use strict';

mage.directive('pdcObservation', ['FeatureTypeService' , 'Feature', function (FeatureTypeService, Feature) {

  return {
    restrict: "A",
    templateUrl: "/js/app/partials/pdc/observation.html",
    controller: "FeatureController",
    link: function(scope) {

      scope.teams = [
        'Coastal Cluster',
        'Coastal Olympic Village',
        'Mountain Cluster',
        'Mountain Olympic Village',
        'Mountain Endurance',
        'ISEG JOC'
      ];

      scope.levels = [{
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

      //Get the Feature Types
      FeatureTypeService.getAllFeatureTypes().
      success(function (types, status, headers, config) {
        scope.types = types;
      }).
      error(function (data, status, headers, config) {
        console.log("Error getting types: " + status);
      });

      scope.createNewObservation = function(location) {
        return new Feature({
          properties: {
            TYPE: scope.types[0].name,
            EVENTLEVEL: scope.levels[0].name,
            TEAM: scope.teams[0] 
          }
        });
      }
    }
  };
}]);