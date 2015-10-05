angular
  .module('mage')
  .directive('fieldDirective', fieldDirective);

function fieldDirective() {
  var directive = {
    template: '<div ng-include src="templatePath"></div>',
    restrict: 'E',
    scope: {
      field: '=',
      observation: '=fieldObservation'
    },
    controller: FieldDirectiveController,
    bindToController: true
  }

  return directive;
}

FieldDirectiveController.$inject = ['$scope'];

function FieldDirectiveController($scope) {
  $scope.datePopup = {open: false};
  $scope.templatePath = getTemplateUrl($scope.field);

  $scope.onLatLngChange = function(field) {
    if (field.name === 'geometry') {
      $scope.$emit('observation:move', $scope.observation, {lat: $scope.field.value.y, lng: $scope.field.value.x});
    }
  }

  $scope.openDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.datePopup.open = true;
  }

  $scope.today = function() {
    $scope.field.value = new Date();
  }

  $scope.clear = function () {
    $scope.field.value = null;
  }

  if ($scope.field.type == 'dropdown' && !$scope.field.required) {
    $scope.field.value = "";
  }

  function getTemplateUrl(field) {
    switch(field.type) {
      case 'textfield':
        return 'app/observation/form/textfield.directive.html';
      case 'email':
        return 'app/observation/form/email.directive.html';
      case 'textarea':
        return 'app/observation/form/textarea.directive.html';
      case 'checkbox':
        return 'app/observation/form/checkbox.directive.html';
      case 'date':
        return 'app/observation/form/date.directive.html';
      case 'geometry':
        return 'app/observation/form/geometry.directive.html';
      case 'dropdown':
        return 'app/observation/form/dropdown.directive.html';
      case 'hidden':
        return 'app/observation/form/hidden.directive.html';
      case 'p***REMOVED***word':
        return 'app/observation/form/p***REMOVED***word.directive.html';
      case 'radio':
        return 'app/observation/form/radio.directive.html';
    }
  }
}
