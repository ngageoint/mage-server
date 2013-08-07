'use strict';

mage.directive('pdcObservation', function () {
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
        name: 'Normal',
        color: 'blue'
      },{
        name: 'Elevated',
        color: 'orange'
      },{
        name: 'High',
        color: 'red'
      }];

      scope.types = [{
        name: 'Residence Overnight',
        icon: 'house'
      },{
        name: 'Arrived',
        icon: 'login'
      },{
        name: 'Departed',
        icon: 'logout'
      },{
        name: 'En Route',
        icon: 'arrow'
      },{
        name: 'Unattended Package',
        icon: 'bomb'
      },{
        name: 'Crowd',
        icon: 'crowd'
      },{
        name: 'Protest',
        icon: 'angry'
      },{
        name: 'At Venue',
        icon: 'building'
      }];

      scope.createNewObservation = function() {
        return {
          attributes: {
            TYPE: scope.types[0].name,
            LEVEL: scope.levels[0].name,
            TEAM: scope.teams[0] 
          }
        };
      }

      scope.featureProperties = ["OBJECTID", "type", "level"];
    }
  };
});