angular
  .module('mage')
  .controller('AdminLayerController', AdminLayerController);

AdminLayerController.$inject = ['$scope', '$uibModal', '$routeParams', '$location', '$filter', 'Layer', 'Event', 'LocalStorageService', 'UserService'];

function AdminLayerController($scope, $uibModal, $routeParams, $location, $filter, Layer, Event, LocalStorageService, UserService) {

  $scope.layerEvents = [];
  $scope.nonTeamEvents = [];
  $scope.eventsPage = 0;
  $scope.eventsPerPage = 10;

  $scope.hasLayerEditPermission =  _.contains(UserService.myself.role.permissions, 'UPDATE_LAYER');
  $scope.hasLayerDeletePermission =  _.contains(UserService.myself.role.permissions, 'DELETE_LAYER');

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
      
      var nonLayerEvents = _.chain(events);
      if (!_.contains(UserService.myself.role.permissions, 'UPDATE_EVENT')) {
        // filter teams based on acl
        nonLayerEvents = nonLayerEvents.filter(function(event) {
          var permissions = event.acl[UserService.myself.id] ? event.acl[UserService.myself.id].permissions : [];
          return _.contains(permissions, 'update');
        });
      }

      nonLayerEvents = nonLayerEvents.reject(function(event) {
        return _.some(event.layers, function(layer) {
          return $scope.layer.id === layer.id;
        });
      });

      $scope.nonLayerEvents = nonLayerEvents.value();
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
    var modalInstance = $uibModal.open({
      templateUrl: '/app/admin/layers/layer-delete.html',
      resolve: {
        layer: function () {
          return $scope.layer;
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

  $scope.status = {};
  $scope.$on('uploadComplete', function(e, url, response, index) {
    $scope.status[index] = response.files[0];
  });
}
