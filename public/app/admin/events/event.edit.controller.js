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
    $location.path('/admin/events/' + $scope.event.id);
  }
}
