angular
  .module('mage')
  .controller('AdminLayerController', AdminLayerController);

AdminLayerController.$inject = ['$scope', '$modal', '$routeParams', '$location', '$filter', 'Layer', 'Event', 'LocalStorageService'];

function AdminLayerController($scope, $modal, $routeParams, $location, $filter, Layer, Event, LocalStorageService) {

  $scope.layerEvents = [];
  $scope.nonTeamEvents = [];
  $scope.eventsPage = 0;
  $scope.eventsPerPage = 10;

  $scope.fileUploadOptions = {
    acceptFileTypes: /(\.|\/)(kml)$/i,
    url: '/api/layers/' + $routeParams.layerId + '/kml?access_token=' + LocalStorageService.getToken()
  };

  $scope.uploads = [{}];
  $scope.uploadConfirmed = false;

  Layer.get({id: $routeParams.layerId}, function(layer) {
    $scope.layer = layer;

    Event.query(function(events) {
      $scope.event = {};
      $scope.layerEvents = _.filter(events, function(event) {
        return _.some(event.layers, function(layer) {
          return $scope.layer.id === layer.id;
        });
      });

      $scope.nonLayerEvents = _.reject(events, function(event) {
        return _.some(event.layers, function(layer) {
          return $scope.layer.id === layer.id;
        });
      });
    });
  });

  $scope.filterEvents = function(event) {
    var filteredEvents = $filter('filter')([event], $scope.eventSearch);
    return filteredEvents && filteredEvents.length;
  };

  $scope.addEventToLayer = function(event) {
    Event.addLayer({id: event.id}, $scope.layer, function(event) {
      $scope.layerEvents.push(event);
      $scope.nonLayerEvents = _.reject($scope.nonLayerEvents, function(e) { return e.id === event.id; });

      $scope.event = {};
    });
  };

  $scope.removeEventFromLayer = function($event, event) {
    $event.stopPropagation();

    Event.removeLayer({id: event.id, layerId: $scope.layer.id}, function(event) {
      $scope.layerEvents = _.reject($scope.layerEvents, function(e) { return e.id === event.id; });
      $scope.nonLayerEvents.push(event);
    });
  };

  $scope.editLayer = function(layer) {
    $location.path('/admin/layers/' + layer.id + '/edit');
  };

  $scope.gotoEvent = function(event) {
    $location.path('/admin/events/' + event.id);
  };

  $scope.deleteLayer = function() {
    var modalInstance = $modal.open({
      templateUrl: '/app/admin/layers/layer-delete.html',
      resolve: {
        layer: function () {
          return $scope.layer;
        }
      },
      controller: ['$scope', '$modalInstance', 'layer', function ($scope, $modalInstance, layer) {
        $scope.layer = layer;

        $scope.deleteLayer = function(layer) {
          layer.$delete(function() {
            $modalInstance.close(layer);
          });
        };

        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function() {
      $location.path('/admin/layers');
    });
  };

  $scope.addUploadFile = function() {
    $scope.uploads.push({});
  };

  $scope.confirmUpload = function() {
    $scope.uploadConfirmed = true;
  };
}
