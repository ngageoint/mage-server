AdminLayerEditController.$inject = ['$scope', '$location', '$routeParams', 'Layer', 'LayerService'];

module.exports = AdminLayerEditController;

function AdminLayerEditController($scope, $location, $routeParams, Layer, LayerService) {
  $scope.saving = false;
  $scope.wmsFormats = ['image/jpeg', 'image/png'];
  $scope.wmsVersions = ['1.1.1', '1.3.0'];

  if ($routeParams.layerId) {
    Layer.get({id: $routeParams.layerId}, function(layer) {
      $scope.layer = layer;
    });
  } else {
    $scope.layer = new Layer();
  }

  $scope.uploads = [{}];

  $scope.$on('uploadFile', function(e, file) {
    if ($scope.layer.type === 'GeoPackage') {
      $scope.layer.geopackage = file;
    }
  });

  $scope.saveLayer = function (layer) {
    if (layer.type === 'GeoPackage' && !layer.id) {
      var geopackage = {
        geopackage: layer.geopackage,
        type: layer.type,
        name: layer.name,
        description: layer.description
      };

      $scope.saving = true;
      $scope.total = layer.geopackage.size;
      $scope.progress = 0;

      LayerService.uploadGeopackage(geopackage).then(function(newLayer) {
        $scope.saving = false;
        $location.path('/admin/layers/' + newLayer.id);
      }, function() { // failure
        $scope.saving = false;
      }, function(e) { //progress
        $scope.progress = e.loaded;
        $scope.total = e.total;
      });
    } else {
      layer.$save({}, function() {
        $location.path('/admin/layers/' + layer.id);
      });
    }
  };

  $scope.cancel = function() {
    var path = $scope.layer.id ? '/admin/layers/' + $scope.layer.id : '/admin/layers';
    $location.path(path);
  };
}
