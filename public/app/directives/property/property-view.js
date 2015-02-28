'use strict';

angular.module('mage').directive('propertyView', function ($http, $compile) {

  return {
    template: '<div ng-include="templateUrl"></div>',
    restrict: 'E',
    scope: {
      field:'='
    },
    link: function(scope, element, attrs) {
       scope.$watch("field", function(field) {
         switch(field.type) {
           case 'textfield':
             scope.templateUrl = 'app/partials/property/textfield.html';
             break;
           case 'email':
             scope.templateUrl = 'app/partials/property/email.html';
             break;
           case 'textarea':
             scope.templateUrl = 'app/partials/property/textarea.html';
             break;
           case 'checkbox':
             scope.templateUrl = 'app/partials/property/checkbox.html';
             break;
           case 'date':
             scope.templateUrl = 'app/partials/property/date.html';
             break;
           case 'geometry':
             scope.templateUrl = 'app/partials/property/geometry.html';
             break;
           case 'dropdown':
             scope.templateUrl = 'app/partials/property/dropdown.html';
             break;
           case 'hidden':
             scope.templateUrl = 'app/partials/property/hidden.html';
             break;
           case 'p***REMOVED***word':
             scope.templateUrl = 'app/partials/property/p***REMOVED***word.html';
             break;
           case 'radio':
             scope.templateUrl = 'app/partials/property/radio.html';
             break;
         }
       });
     }
  };
});
