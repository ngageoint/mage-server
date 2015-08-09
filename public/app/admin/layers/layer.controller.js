angular
  .module('mage')
  .controller('AdminLayerController', AdminLayerController);

AdminLayerController.$inject = ['$scope', '$injector', '$routeParams', '$location', 'Layer'];

function AdminLayerController($scope, $injector, $routeParams, $location, Layer) {

  Layer.get({id: $routeParams.layerId}, function(layer) {
    $scope.layer = layer;
  });

  $scope.editLayer = function(layer) {
    $location.path('/admin/layers/' + layer.id + '/edit');
  }

  $scope.deleteLayer = function(layer) {
    var modalInstance = $injector.get('$modal').open({
      templateUrl: '/app/admin/layers/layer-delete.html',
      resolve: {
        layer: function () {
          return $scope.layer;
        }
      },
      controller: ['$scope', '$modalInstance', 'layer', function ($scope, $modalInstance, layer) {
        $scope.layer = layer;

        $scope.deleteLayer = function(layer, force) {
          layer.$delete(function(success) {
            $modalInstance.close(layer);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function(layer) {
      $location.path('/admin/layers');
    });
  }
}
