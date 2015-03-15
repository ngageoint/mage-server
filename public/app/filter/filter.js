angular
  .module('mage')
  .controller('FilterController', FilterController);

  FilterController.$inject = ['$scope', '$modalInstance', 'EventService', 'FilterService', 'Event', 'events'];

function FilterController($scope, $modalInstance, EventService, FilterService, Event, events) {
  $scope.filterEvent = {selected: FilterService.getEvent()};
  $scope.events = events;

  $scope.intervals = FilterService.intervals;
  $scope.interval = FilterService.getTimeInterval();
  $scope.localTime = true;
  $scope.localOffset = moment().format('Z');
  $scope.startDate = moment().startOf('day').toDate();
  $scope.endDate = moment().endOf('day').toDate();

  $scope.startDatePopup = {open: false};
  $scope.endDatePopup = {open: false};

  $scope.performFilter = function() {
    FilterService.setEvent($scope.filterEvent.selected);

    var options = {};
    if ($scope.interval.filter === 'custom') {
      options.startDate = $scope.startDate;
      options.endDate = $scope.endDate;
      options.localTime = $scope.localTime;
    }

    FilterService.setTimeInterval($scope.interval, options);

    $modalInstance.dismiss('filter');
  }

  $scope.closeModal = function () {
    $modalInstance.dismiss('cancel');
  };

  $scope.openStartDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.startDatePopup.open = true;
  };

  $scope.openEndDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.endDatePopup.open = true;
  };
}
