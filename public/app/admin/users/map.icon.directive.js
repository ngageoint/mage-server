angular
  .module('mage')
  .directive('mapIcon', mapIcon);

function mapIcon() {
  var directive = {
    restrict: "A",
    template: '<canvas></canvas>',
    replace: true,
    scope: {
      icon: '=mapIcon'
    },
    controller: MapIconController
  };

  return directive;
}

MapIconController.$inject = ['$scope', '$element', 'UserIconService'];

function MapIconController($scope, $element, UserIconService) {
  var fontLoaded = false;

  WebFont.load({
    custom: {
      families: ['RobotoMono']
    },
    fontactive: function() {
      fontLoaded = true;
      updateIcon();
    }
  });

  function updateIcon() {

    var canvas = $element[0];
    UserIconService.drawMarker(canvas, $scope.icon.color, $scope.icon.text);

    $scope.icon.getCanvas = function() {
      return canvas;
    };
  }

  $scope.$watch('icon', function() {
    if (!$scope.icon || !fontLoaded) return;

    updateIcon();
  }, true);
}
