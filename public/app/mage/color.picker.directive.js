angular
  .module('mage')
  .directive('colorPicker', colorPicker);

function colorPicker() {
  var directive = {
    restrict: "A",
    scope: {
      colorPicker: '='
    },
    controller: ColorPickerController
  };

  return directive;
}

ColorPickerController.$inject = ['$scope', '$element'];

function ColorPickerController($scope, $element) {
  $element.colorpicker({color: $scope.colorPicker || '#FFFFFF'}).on('changeColor.colorpicker', function(event) {
    $scope.$apply(function() {
      $scope.colorPicker = event.color.toHex();
    });
  });

  $scope.$watch('colorPicker', function(newValue, oldValue) {
    $element.colorpicker('setValue', newValue);
  });
}
