AdminEventEditController.$inject = ['$scope', '$location', '$routeParams', 'Event'];

module.exports = AdminEventEditController;

function AdminEventEditController($scope, $location, $routeParams, Event) {
  if ($routeParams.eventId) {
    Event.get({id: $routeParams.eventId}, function(event) {
      $scope.event = new Event({
        id: event.id,
        name: event.name,
        description: event.description
      });
    });
  } else {
    $scope.event = new Event();
  }

  $scope.saveEvent = function(event) {
    event.$save(function() {
      $location.path('/admin/events/' + event.id);
    }, function(res) {
      if (res.status === 500) {
        $scope.error = {
          message: res.data
        };
      } else if (res.data && res.data.message) {
        $scope.error = {
          message: 'Error Saving Event Information',
          errors: res.data.errors
        };
      }
    });
  };

  $scope.cancel = function() {
    var path = $scope.event.id ? '/admin/events/' + $scope.event.id : '/admin/events';
    $location.path(path);
  };

  $scope.$on('uploadFile', function(e, uploadFile) {
    $scope.event.formArchiveFile = uploadFile;
  });
}
