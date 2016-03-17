angular
  .module('mage')
  .directive('mapIcon', mapIcon);

function mapIcon() {
  var directive = {
    restrict: "A",
    template: '<canvas height="44" width="44"></canvas>',
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

  function hexToRgb(hex, opacity) {
    hex = hex.replace('#','');
    var r = parseInt(hex.substring(0,2), 16);
    var g = parseInt(hex.substring(2,4), 16);
    var b = parseInt(hex.substring(4,6), 16);

    return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
  }

  function updateIcon() {
    var canvas = $element[0];

    $scope.icon.getPng = function() {
      return canvas.toDataURL("image/png");
    };

    if (canvas.getContext) {
      var ctx = canvas.getContext('2d');
      ctx.clearRect (0 , 0 , canvas.width, canvas.height);

      ctx.strokeStyle = hexToRgb($scope.icon.color, 1);
      ctx.fillStyle = hexToRgb($scope.icon.color, 1);

      ctx.moveTo(22, 43);
      ctx.lineTo(9, 26);
      ctx.lineTo(35, 26);
      ctx.lineTo(22, 43);
      ctx.stroke();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(22, 17, 16, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#FFFFFF';

      ctx.beginPath();
      ctx.arc(22, 17, 13, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '400 14px "RobotoMono"';
      ctx.fillStyle = hexToRgb($scope.icon.color, 1);
      ctx.fillText($scope.icon.text, 22, 17);
    } else {
      // console.log('no canvas support');
    }
  }

  $scope.$watch('icon', function() {
    if (!$scope.icon || !fontLoaded) return;

    updateIcon();
  }, true);
}
