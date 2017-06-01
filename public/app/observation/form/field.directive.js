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

  $scope.shapes = [{
    display: 'Point',
    value: 'Point'
  },{
    display: 'Line',
    value: 'LineString'
  },{
    display: 'Polygon',
    value: 'Polygon'
  }];

  if ($scope.field.type === 'geometry') {
    $scope.shape = {
      type:$scope.field.value.type
    };
  }

  $scope.validateShapeChange = function() {
    if (!$scope.shape || !$scope.shape.type || $scope.shape.type === $scope.field.value.type) return;

    switch($scope.shape.type) {
      case 'Point':
        $scope.field.value.coordinates = [];
        $scope.field.value.type = 'Point';
        //  = {
        //   type: 'Point',
        //   coordinates: []
        // };
        break;
      case 'LineString':
      $scope.field.value.coordinates = [];
      $scope.field.value.type = 'LineString';
        // $scope.field.value = {
        //   type: 'LineString',
        //   coordinates: []
        // }
        break;
      case 'Polygon':
      $scope.field.value.coordinates = [[]];
      $scope.field.value.type = 'Polygon';
        // $scope.field.value = {
        //   type: 'Polygon',
        //   coordinates: [[]]
        // }
        break;
    }


    // $scope.field.value.coordinates = [];

    // switch($scope.shape.type) {
    //   case 'Point':
    //     if ($scope.field.value.type === 'LineString') {
    //       $scope.field.value.coordinates = [$scope.field.value.coordinates[$scope.field.editedVertex][0], $scope.field.value.coordinates[$scope.field.editedVertex][1]];
    //     } else {
    //       $scope.field.value.coordinates = [$scope.field.value.coordinates[0][$scope.field.editedVertex][0], $scope.field.value.coordinates[0][$scope.field.editedVertex][1]];
    //     }
    //   break;
    //   case 'LineString':
    //     if ($scope.field.value.type === 'Point') {
    //       $scope.field.value.coordinates = [$scope.field.value.coordinates, [$scope.field.value.coordinates[0]+.005, $scope.field.value.coordinates[1]+.005]];
    //     } else {
    //       if ($scope.field.editedVertex === 0) {
    //         $scope.field.value.coordinates = $scope.field.value.coordinates[0].slice(0,$scope.field.value.coordinates[0].length-1);
    //       } else {
    //         var newCoords = $scope.field.value.coordinates[0].slice($scope.field.editedVertex,$scope.field.value.coordinates[0].length-1);
    //         newCoords = newCoords.concat($scope.field.value.coordinates[0].slice(0, $scope.field.editedVertex));
    //         $scope.field.value.coordinates = newCoords;
    //       }
    //     }
    //   break;
    //   case 'Polygon':
    //     if ($scope.field.value.type === 'Point') {
    //       $scope.field.value.coordinates = [[
    //         $scope.field.value.coordinates,
    //         [$scope.field.value.coordinates[0]+.005, $scope.field.value.coordinates[1]],
    //         [$scope.field.value.coordinates[0]+.005, $scope.field.value.coordinates[1]+.005],
    //         [$scope.field.value.coordinates[0], $scope.field.value.coordinates[1]+.005],
    //         $scope.field.value.coordinates
    //       ]];
    //     } else {
    //       $scope.field.value.coordinates = [$scope.field.value.coordinates];
    //       $scope.field.value.coordinates[0].push($scope.field.value.coordinates[0][0]);
    //     }
    //   break;
    // }

    $scope.field.value.type = $scope.shape.type;
  }

  $scope.$watch('shape.type', $scope.validateShapeChange);

  $scope.datePopup = {open: false};
  $scope.templatePath = types[$scope.field.type];

  $scope.$watch('selected.value', function(value) {
    if (!value) return;

    $scope.field.value = [value];
  });

  $scope.onLatLngChange = function(field) {
    if (field.name === 'geometry') {
      $scope.$emit('observation:move', $scope.observation, $scope.field.value);
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
