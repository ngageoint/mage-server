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
        name: 'None',
        color: 'blue'
      },{
        name: 'Low',
        color: 'green'
      },{
        name: 'Medium',
        color: 'orange'
      },{
        name: 'High',
        color: 'red'
      }];

      scope.types = [{
        name: 'At Venue',
        icon: 'building'
      },{
        name: 'Protest',
        icon: 'fist'
      },{
        name: 'Other Event',
        icon: 'calendar'
      },{
        name: 'Parade Event',
        icon: 'ballon'
      },{
        name: 'CBRN Hazard',
        icon: 'radio-active'
      },{
        name: 'Crowd',
        icon: 'people'
      },{
        name: 'Explosion',
        icon: 'new'
      },{
        name: 'Fire',
        icon: 'fire'
      },{
        name: 'Medical Incident',
        icon: 'ambulance'
      },{
        name: 'Transportation Incident',
        icon: 'car'
      },{
        name: 'Other Activity',
       icon: 'activity'
      },{
        name: 'Shots Fired',
        icon: 'gun'
      },{
        name: 'Significant Incident',
        icon: 'asterisk'
      },{
        name: 'Suspicious Individual',
        icon: 'running'
      },{
        name: 'Suspicious Vehicle',
        icon: 'car'
      },{
        name: 'Suspicious Package',
        icon: 'gift'
      },{
        name: 'Violent Activity',
        icon: 'hit'
      },{
        name: 'Remain Over Night',
        icon: 'moon-fill'
      },{
        name: 'Arrival',
        icon: 'login'
      },{
        name: 'Departure',
        icon: 'logout'
      },{
        name: 'Aeronautical Incident',
        icon: 'airplane'
      },{
        name: 'Maritime Incident',
        icon: 'anchor'
      },{
        name: 'Evacuation',
        icon: 'ban-circle'
      },{
        name: 'Hostage',
        icon: 'hostage'
      },{
        name: 'Kidnapping',
        icon: 'kidnap'
      },{
        name: 'VIP',
        icon: 'star'
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
    }
  };
});