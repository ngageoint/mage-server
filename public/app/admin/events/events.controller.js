angular
  .module('mage')
  .controller('AdminEventsController', AdminEventsController);

AdminEventsController.$inject = ['$scope', '$location', '$filter', '$uibModal', 'Event'];

function AdminEventsController($scope, $location, $filter, $uibModal, Event) {
  $scope.events = [];
  $scope.filter = "active"; // possible values all, active, complete
  $scope.page = 0;
  $scope.itemsPerPage = 10;

  Event.query({state: 'all',  populate: false}, function(events) {
    $scope.events = events;
  });

  $scope.filterComplete = function (event) {
    switch ($scope.filter) {
    case 'all': return true;
    case 'active': return !event.complete;
    case 'complete': return event.complete;
    }
  };

  $scope.filterEvents = function(event) {
    var filteredEvents = $filter('filter')([event], $scope.eventSearch);
    return filteredEvents && filteredEvents.length;
  };

  $scope.reset = function() {
    $scope.page = 0;
    $scope.eventSearch = '';
  };

  $scope.newEvent = function() {
    $location.path('/admin/events/new');
  };

  $scope.gotoEvent = function(event) {
    $location.path('/admin/events/' + event.id);
  };

  $scope.editEvent = function($event, event) {
    $event.stopPropagation();

    $location.path('/admin/events/' + event.id + '/edit');
  };

  $scope.deleteEvent = function($event, event) {
    $event.stopPropagation();

    var modalInstance = $uibModal.open({
      templateUrl: '/app/admin/events/event-delete.html',
      resolve: {
        event: function () {
          return event;
        }
      },
      controller: ['$scope', '$uibModalInstance', 'event', function ($scope, $uibModalInstance, event) {
        $scope.event = event;

        $scope.deleteEvent = function(event) {
          event.$delete(function() {
            $uibModalInstance.close(event);
          });
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function (event) {
      $scope.events = _.without($scope.events, event);
    });
  };
}
