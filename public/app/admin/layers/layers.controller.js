angular
  .module('mage')
  .controller('AdminLayersController', AdminLayersController);

AdminLayersController.$inject = ['$scope', '$filter', '$injector', '$location', 'LocalStorageService', 'Layer'];

function AdminLayersController($scope, $filter, $injector, $location, LocalStorageService, Layer) {
  $scope.filter = "all";
  $scope.layers = [];
  $scope.page = 0;
  $scope.itemsPerPage = 10;

  Layer.query(function(layers) {
    $scope.layers = layers;
    console.log('layers', layers);
  });

  $scope.filterLayers = function(layer) {
    var filteredLayers = $filter('filter')([layer], $scope.layerSearch);
    if (filteredLayers && filteredLayers.length) {
      return true;
    } else {
      return false;
    }
  }

  $scope.filterType = function (layer) {
    switch ($scope.filter) {
      case 'all': return true;
      case 'base': return layer.base && layer.type == 'Imagery';
      case 'imagery': return !layer.base && layer.type == 'Imagery';
      case 'feature': return !layer.base && layer.type == 'Feature';
    }
  }

  $scope.reset = function() {
    $scope.page = 0;
    $scope.filter = 'all';
    $scope.layerSearch = '';
  }

  $scope.newLayer = function() {
    $location.path('/admin/layers/new');
  }

  $scope.gotoLayer = function(layer) {
    $location.path('/admin/layers/' + layer.id);
  }

  $scope.editLayer = function($event, layer) {
    $event.stopPropagation();

    $location.path('/admin/layers/' + layer.id + '/edit');
  }

  $scope.deleteLayer = function($event, layer) {
    $event.stopPropagation();

    var modalInstance = $injector.get('$modal').open({
      templateUrl: '/app/admin/layers/layer-delete.html',
      resolve: {
        layer: function () {
          return layer;
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

    modalInstance.result.then(function (layer) {
      $scope.layers = _.without($scope.layers, layer);
    });
  }
}
