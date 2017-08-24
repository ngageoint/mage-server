angular
  .module('mage')
  .controller('AdminLayersController', AdminLayersController);

AdminLayersController.$inject = ['$scope', '$filter', '$uibModal', '$location', 'Layer', 'UserService'];

function AdminLayersController($scope, $filter, $uibModal, $location, Layer, UserService) {
  $scope.filter = "all";
  $scope.layers = [];
  $scope.page = 0;
  $scope.itemsPerPage = 10;

  $scope.hasLayerCreatePermission =  _.contains(UserService.myself.role.permissions, 'CREATE_LAYER');
  $scope.hasLayerEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_LAYER');
  $scope.hasLayerDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_LAYER');

  Layer.query(function(layers) {
    $scope.layers = layers;
  });

  $scope.filterLayers = function(layer) {
    var filteredLayers = $filter('filter')([layer], $scope.layerSearch);
    return filteredLayers && filteredLayers.length;
  };

  $scope.filterType = function (layer) {
    switch ($scope.filter) {
    case 'all': return true;
    case 'base': return layer.base && layer.type === 'Imagery';
    case 'imagery': return !layer.base && layer.type === 'Imagery';
    case 'feature': return !layer.base && layer.type === 'Feature';
    }
  };

  $scope.reset = function() {
    $scope.page = 0;
    $scope.filter = 'all';
    $scope.layerSearch = '';
  };

  $scope.newLayer = function() {
    $location.path('/admin/layers/new');
  };

  $scope.gotoLayer = function(layer) {
    $location.path('/admin/layers/' + layer.id);
  };

  $scope.editLayer = function($event, layer) {
    $event.stopPropagation();

    $location.path('/admin/layers/' + layer.id + '/edit');
  };

  $scope.deleteLayer = function($event, layer) {
    $event.stopPropagation();

    var modalInstance = $uibModal.open({
      templateUrl: '/app/admin/layers/layer-delete.html',
      resolve: {
        layer: function () {
          return layer;
        }
      },
      controller: ['$scope', '$uibModalInstance', 'layer', function ($scope, $uibModalInstance, layer) {
        $scope.layer = layer;

        $scope.deleteLayer = function(layer) {
          layer.$delete(function() {
            $uibModalInstance.close(layer);
          });
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function (layer) {
      $scope.layers = _.without($scope.layers, layer);
    });
  };
}
