'use strict';

mage.directive('***REMOVED***Observation', function () {
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
      scope.types = [
        'Animal Issue',
        'Chemical Hazard',
        'Command Post',
        'Confirmed Victim',
        'Confirmed Victim Removed',
        'Emergency Collection Point',
        'Fire',
        'Helicopter Landing Site',
        'Human Remains',
        'Possible Criminal Activity',
        'Shelter in Place',
        'Special Needs',
        'Staging Area',
        'Start Search',
        'Stop Search',
        'Structure Damaged but Safe',
        'Structure Major Damage No Entry',
        'Structure No Damage',
        'Victim Detected',
        'Water Level'  
      ];
    }
  };
});