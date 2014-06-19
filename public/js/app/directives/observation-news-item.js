mage.directive('observationNewsItem', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/observation-news-item.html",
    scope: {
    	observation: '=observationNewsItem',
      containerElement: '@'
    },
    controller: function ($scope, ObservationService, mageLib, MapService, $element, appConstants) {
      $scope.appConstants = appConstants;
      $scope.ms = MapService;
      $scope.attachmentUrl = '/FeatureServer/' + $scope.observation.layerId + '/features/';
      $scope.token = mageLib.getLocalItem('token');
      $scope.readOnlyMode = appConstants.readOnly;
      $scope.mapClipConfig = {
        coordinates: $scope.observation.geometry.coordinates,
        geoJsonFormat: true
      };

      $scope.setActiveObservation = function(observation) {
        $scope.$emit('observationClick', observation);
      }

      $scope.startEdit = function() {
        ObservationService.createNewForm($scope.observation).then(function(form) {
          $scope.editObservation = angular.copy($scope.observation);
          $scope.editForm = form;
        });
      }

      $scope.$watch('editForm', function() {
        ObservationService.createNewForm($scope.observation)
          .then(function(form) {
            $scope.viewForm = form;
          });
      });

      $scope.$on('newObservationSaved', function(e, observation) {
        angular.copy(observation, $scope.observation);
      });

      $scope.$on('newAttachmentSaved', function(e, attachment) {
        $scope.observation.attachments.push(attachment);
      });

      $scope.$on('attachmentDeleted', function(e, attachment) {
        $scope.observation.attachments = _.filter($scope.observation.attachments, function(a) {return a.id != attachment.id});
      });
    }
  };
});
