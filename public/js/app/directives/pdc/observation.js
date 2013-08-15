'use strict';

mage.directive('pdcObservation', ['FeatureTypeService' , function (FeatureTypeService) {

  return {
    restrict: "A",
    templateUrl: "/js/app/partials/pdc/observation.html",
    controller: "FeatureController",
    link: function(scope) {

      scope.teams = [
        'NW',
        'NE',
        'SE',
        'SW'
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
        return {
          attributes: {
            TYPE: scope.types[0].name,
            EVENTLEVEL: scope.levels[0].name,
            TEAM: scope.teams[0] 
          }
        };
      }
    }
  };
}]);