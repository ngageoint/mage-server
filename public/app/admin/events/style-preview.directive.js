module.exports = stylePreview;

function stylePreview() {
  var directive = {
    restrict: "A",
    template: '<canvas height="20" width="34"></canvas>',
    replace: true,
    scope: {
      stylePreview: '=',
      primary: '=',
      variant: '=',
      type: '@'
    },
    controller: StylePreviewController
  };

  return directive;
}

StylePreviewController.$inject = ['$scope', '$element'];

function StylePreviewController($scope, $element) {

  function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  $scope.$watch('stylePreview', function() {
    if (!$scope.stylePreview) return;
    var canvas = $element[0];
    var style = $scope.stylePreview;
    if ($scope.stylePreview[$scope.primary] && $scope.stylePreview[$scope.primary][$scope.variant]) {
      style = $scope.stylePreview[$scope.primary][$scope.variant];
    } else if ($scope.stylePreview[$scope.primary]) {
      style = $scope.stylePreview[$scope.primary];
    }

    if (canvas.getContext){
      var ctx = canvas.getContext('2d');
      ctx.clearRect ( 0 , 0 , canvas.width, canvas.height );
      var rgbFill = hexToRgb(style.fill);
      ctx.fillStyle = "rgba("+rgbFill.r+","+rgbFill.g+","+rgbFill.b+","+style['fillOpacity']+")";
      ctx.lineWidth = style['strokeWidth'];
      var rgbStroke = hexToRgb(style.stroke);
      ctx.strokeStyle = "rgba("+rgbStroke.r+","+rgbStroke.g+","+rgbStroke.b+","+style['strokeOpacity']+")";

      if ($scope.type === 'Polygon') {
        ctx.beginPath();
        ctx.moveTo(32,2);
        ctx.lineTo(14,2);
        ctx.lineTo(2,18);
        ctx.lineTo(20,18);
        ctx.lineTo(32,2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if ($scope.type === 'LineString') {
        ctx.beginPath();
        ctx.moveTo(2,15);
        ctx.lineTo(12,2);
        ctx.lineTo(22,12);
        ctx.lineTo(32,2);
        ctx.stroke();
      }

    }
  }, true);
}
