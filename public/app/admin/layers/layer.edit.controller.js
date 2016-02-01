angular
  .module('mage')
  .controller('AdminLayerEditController', AdminLayerEditController);

AdminLayerEditController.$inject = ['$scope', '$injector', '$location', '$routeParams', 'LocalStorageService', 'Layer'];

function AdminLayerEditController($scope, $injector, $location, $routeParams, LocalStorageService, Layer) {
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

  $scope.saveLayer = function (layer) {
    layer.$save({}, function() {
      $location.path('/admin/layers/' + layer.id);
    });
  };

  $scope.cancel = function() {
    $location.path('/admin/layers/' + $scope.layer.id);
  };
}
