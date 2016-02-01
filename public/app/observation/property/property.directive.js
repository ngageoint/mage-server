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
  };

  return directive;
}

PropertyViewController.$inject = ['$scope'];

function PropertyViewController($scope) {
  var types = {
    textfield: 'app/observation/property/textfield.directive.html',
    email: 'app/observation/property/email.directive.html',
    textarea: 'app/observation/property/textarea.directive.html',
    checkbox: 'app/observation/property/checkbox.directive.html',
    date: 'app/observation/property/date.directive.html',
    geometry: 'app/observation/property/geometry.directive.html',
    dropdown: 'app/observation/property/dropdown.directive.html',
    hidden: 'app/observation/property/hidden.directive.html',
    password: 'app/observation/property/password.directive.html',
    radio: 'app/observation/property/radio.directive.html'
  };

  $scope.templatePath = types[$scope.field.type];
}
