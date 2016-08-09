angular
  .module('mage')
  .directive('fieldDirective', fieldDirective);

function fieldDirective() {
  var directive = {
    template: '<div ng-include src="templatePath"></div>',
    restrict: 'E',
    scope: {
      field: '=',
      observation: '=fieldObservation',
      form: '=fieldForm'
    },
    controller: FieldDirectiveController
  };

  return directive;
}

FieldDirectiveController.$inject = ['$scope'];

function FieldDirectiveController($scope) {
  var types = {
    textfield: 'app/observation/form/textfield.directive.html',
    numberfield: 'app/observation/form/numberfield.directive.html',
    email: 'app/observation/form/email.directive.html',
    textarea: 'app/observation/form/textarea.directive.html',
    checkbox: 'app/observation/form/checkbox.directive.html',
    date: 'app/observation/form/date.directive.html',
    geometry: 'app/observation/form/geometry.directive.html',
    dropdown: 'app/observation/form/dropdown.directive.html',
    multiselectdropdown: 'app/observation/form/multiselectdropdown.directive.html',
    hidden: 'app/observation/form/hidden.directive.html',
    password: 'app/observation/form/password.directive.html',
    radio: 'app/observation/form/radio.directive.html'
  };

  $scope.datePopup = {open: false};
  $scope.templatePath = types[$scope.field.type];

  $scope.$watch('selected.value', function(value) {
    if (!value) return;

    $scope.field.value = [value];
  });

  $scope.onLatLngChange = function(field) {
    if (field.name === 'geometry') {
      $scope.$emit('observation:move', $scope.observation, {lat: $scope.field.value.y, lng: $scope.field.value.x});
    }
  };

  $scope.openDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.datePopup.open = true;
  };

  $scope.today = function() {
    $scope.field.value = new Date();
  };

  $scope.clear = function () {
    $scope.field.value = null;
  };
}
