mage.directive('observationNewsItem', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/observation-news-item.html",
    scope: {
    	observation: '=observationNewsItem'
    },
    controller: function ($scope, EventService, ObservationService, mageLib, MapService) {
      $scope.form = EventService.createForm($scope.observation);

      $scope.ms = MapService;
      $scope.attachmentUrl = '/FeatureServer/' + $scope.observation.layerId + '/features/';
      $scope.token = mageLib.getLocalItem('token');
      $scope.mapClipConfig = {
        coordinates: $scope.observation.geometry.coordinates,
        geoJsonFormat: true
      };

      $scope.setActiveObservation = function(observation) {
        $scope.$emit('observationClick', observation);
      }

      $scope.filterArchived = function(field) {
        return !field.archived;
      }

      $scope.$on('observationEditDone', function() {
        $scope.edit = false;
      });

      // TODO should this be moved into the form directive?
      // $scope.$on('attachmentSaved', function(e, attachment) {
      //   $scope.observation.attachments.push(attachment);
      // });

      //
      // // TODO should this be moved into the form directive?
      // $scope.$on('attachmentDeleted', function(e, attachment) {
      //   $scope.observation.attachments = _.filter($scope.observation.attachments, function(a) {return a.id != attachment.id});
      // });
    }
  };
});
