'use strict';

angular.module('mage').directive('propertyView', function ($http, $compile) {

  var getTemplateUrl = function(field) {
      var type = field.type;
      var templateUrl = '';

      switch(type) {
        case 'textfield':
          templateUrl = 'js/app/partials/property/textfield.html';
          break;
        case 'email':
          templateUrl = 'js/app/partials/property/email.html';
          break;
        case 'textarea':
          templateUrl = 'js/app/partials/property/textarea.html';
          break;
        case 'checkbox':
          templateUrl = 'js/app/partials/property/checkbox.html';
          break;
        case 'date':
          templateUrl = 'js/app/partials/property/date.html';
          break;
        case 'geometry':
          templateUrl = 'js/app/partials/property/geometry.html';
          break;
        case 'dropdown':
          templateUrl = 'js/app/partials/property/dropdown.html';
          break;
        case 'hidden':
          templateUrl = 'js/app/partials/property/hidden.html';
          break;
        case 'p***REMOVED***word':
          templateUrl = 'js/app/partials/property/p***REMOVED***word.html';
          break;
        case 'radio':
          templateUrl = 'js/app/partials/property/radio.html';
          break;
      }

      return templateUrl;
  }

  return {
    template: '<div></div>',
    restrict: 'E',
    scope: {
      field:'='
    },
    link: function(scope, element) {
      // GET template content from path
      var templateUrl = getTemplateUrl(scope.field);
      $http.get(templateUrl).success(function(data) {
          element.html(data);
          $compile(element.contents())(scope);
      });
    }
  };
});
