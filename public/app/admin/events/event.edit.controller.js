angular
  .module('mage')
  .controller('AdminEventEditController', AdminEventEditController);

AdminEventEditController.$inject = ['$scope', '$location', '$routeParams', 'Event'];

function AdminEventEditController($scope, $location, $routeParams, Event) {
  if ($routeParams.eventId) {
    Event.get({id: $routeParams.eventId}, function(event) {
      $scope.event = event;
    });
  } else {
    $scope.event = new Event();
  }

  $scope.saveEvent = function(event) {
    event.$save(function() {
      $location.path('/admin/events/' + event.id);
    }, function(reponse) {

    });
  }

  $scope.cancel = function() {
    var path = $scope.event.id ? '/admin/events/' + $scope.event.id : '/admin/events';
    $location.path(path);
  }

  $scope.$on('uploadFile', function(e, uploadFile) {
    $scope.event.formArchiveFile = uploadFile;
  });
}
