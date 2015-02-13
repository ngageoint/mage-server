'use strict';

angular.module('mage').directive('fieldDirective', function ($http) {
  var getTemplateUrl = function(field) {
    var type = field.type;
    var templateUrl = '';

    switch(type) {
      case 'textfield':
        templateUrl = 'js/app/partials/form/field/textfield.html';
        break;
      case 'email':
        templateUrl = 'js/app/partials/form/field/email.html';
        break;
      case 'textarea':
        templateUrl = 'js/app/partials/form/field/textarea.html';
        break;
      case 'checkbox':
        templateUrl = 'js/app/partials/form/field/checkbox.html';
        break;
      case 'date':
        templateUrl = 'js/app/partials/form/field/date.html';
        break;
      case 'geometry':
        templateUrl = 'js/app/partials/form/field/geometry.html';
        break;
      case 'dropdown':
        templateUrl = 'js/app/partials/form/field/dropdown.html';
        break;
      case 'hidden':
        templateUrl = 'js/app/partials/form/field/hidden.html';
        break;
      case 'p***REMOVED***word':
        templateUrl = 'js/app/partials/form/field/p***REMOVED***word.html';
        break;
      case 'radio':
        templateUrl = 'js/app/partials/form/field/radio.html';
        break;
    }
    return templateUrl;
  }

  return {
    template: '<div ng-include src="templatePath"></div>',
    restrict: 'E',
    scope: {
      field: '=',
      observation: '=fieldObservation'
    },
    controller: function($scope) {
      $scope.templatePath = getTemplateUrl($scope.field);

      $scope.onLatLngChange = function(field) {
        if (field.name === 'geometry') {
          $scope.$emit('observation:move', $scope.observation, {lat: $scope.field.value.y, lng: $scope.field.value.x});
        }
      }

    }
  };
});
