angular
  .module('mage')
  .directive('mapIcon', mapIcon);

function mapIcon() {
  var directive = {
    restrict: "A",
    template: '<canvas height="48" width="48"></canvas>',
    replace: true,
    scope: {
      icon: '=mapIcon'
    },
    controller: MapIconController
  };

  return directive;
}

MapIconController.$inject = ['$scope', '$element'];

function MapIconController($scope, $element) {

  function hexToRgb(hex, opacity) {
    hex = hex.replace('#','');
    var r = parseInt(hex.substring(0,2), 16);
    var g = parseInt(hex.substring(2,4), 16);
    var b = parseInt(hex.substring(4,6), 16);

    return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
  }

  $scope.$watch('icon', function() {
    if (!$scope.icon) return;

    var canvas = $element[0];

    $scope.icon.getPng = function() {
      return canvas.toDataURL("image/png");
    };

    if (canvas.getContext) {
      var ctx = canvas.getContext('2d');
      ctx.clearRect (0 , 0 , canvas.width, canvas.height);

      ctx.strokeStyle = hexToRgb($scope.icon.color, 1);
      ctx.fillStyle = hexToRgb($scope.icon.color, 1);

      ctx.moveTo(24, 48);
      ctx.lineTo(11, 31);
      ctx.lineTo(37, 31);
      ctx.lineTo(24, 48);
      ctx.stroke();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(24, 22, 16, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#FFFFFF';

      ctx.beginPath();
      ctx.arc(24, 22, 13, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '11pt Menlo';
      ctx.fillStyle = hexToRgb($scope.icon.color, 1);
      ctx.fillText($scope.icon.text, 24, 22);
    } else {
      // console.log('no canvas support');
    }
  }, true);
}
