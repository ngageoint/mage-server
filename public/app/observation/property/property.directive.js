angular
  .module('mage')
  .directive('propertyView', propertyView);

function propertyView() {
  var directive = {
    template: '<div ng-include src="templatePath"></div>',
    restrict: 'E',
    scope: {
      field:'='
    },
    controller: PropertyViewController,
    bindToController: true
  }

  return directive;
}

PropertyViewController.$inject = ['$scope'];

function PropertyViewController($scope) {
  $scope.templatePath = getTemplateUrl($scope.field);

  function getTemplateUrl(field) {
    switch(field.type) {
      case 'textfield':
        return 'app/observation/property/textfield.directive.html';
      case 'email':
        return 'app/observation/property/email.directive.html';
      case 'textarea':
        return 'app/observation/property/textarea.directive.html';
      case 'checkbox':
        return 'app/observation/property/checkbox.directive.html';
      case 'date':
        return 'app/observation/property/date.directive.html';
      case 'geometry':
        return 'app/observation/property/geometry.directive.html';
      case 'dropdown':
        return 'app/observation/property/dropdown.directive.html';
      case 'hidden':
        return 'app/observation/property/hidden.directive.html';
      case 'password':
        return 'app/observation/property/password.directive.html';
      case 'radio':
        return 'app/observation/property/radio.directive.html';
    }
  }
}
