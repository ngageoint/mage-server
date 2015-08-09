angular
  .module('mage')
  .controller('AdminEventsController', AdminEventsController);

AdminEventsController.$inject = ['$scope', '$location', '$filter', '$modal', 'Event'];

function AdminEventsController($scope, $location, $filter, $modal, Event) {
  $scope.events = [];
  $scope.page = 0;
  $scope.itemsPerPage = 15;

  Event.query({populate: false}, function(events) {
    $scope.events = events;
  });

  $scope.filterEvents = function(event) {
    var filteredEvents = $filter('filter')([event], $scope.eventSearch);
    return filteredEvents && filteredEvents.length;
  }

  $scope.reset = function() {
    $scope.page = 0;
    $scope.eventSearch = '';
  }

  $scope.newEvent = function() {
    $location.path('/admin/events/new');
  }

  $scope.gotoEvent = function(event) {
    $location.path('/admin/events/' + event.id);
  }

  $scope.editEvent = function($event, event) {
    $event.stopPropagation();

    $location.path('/admin/events/' + event.id + '/edit');
  }

  $scope.deleteEvent = function($event, event) {
    $event.stopPropagation();

    var modalInstance = $modal.open({
      templateUrl: '/app/admin/events/event-delete.html',
      resolve: {
        event: function () {
          return event;
        }
      },
      controller: ['$scope', '$modalInstance', 'event', function ($scope, $modalInstance, event) {
        $scope.event = event;

        $scope.deleteEvent = function(event, force) {
          console.info('delete event');
          event.$delete(function(success) {
            console.info('event delete success');
            $modalInstance.close(event);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function (event) {
      $scope.events = _.without($scope.events, event);
    }, function () {
    });
  }
}
