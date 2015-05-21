angular
  .module('mage')
  .controller('FilterController', FilterController);

  FilterController.$inject = ['$scope', '$modalInstance', 'EventService', 'FilterService', 'Event', 'events'];

function FilterController($scope, $modalInstance, EventService, FilterService, Event, events) {
  $scope.events = events;

  $scope.filterEvent = {selected: FilterService.getEvent()};
  $scope.filterTeams = {selected: FilterService.getTeams()};
  $scope.interval = FilterService.getInterval();

  $scope.intervalChoices = FilterService.intervals;
  $scope.intervalChoice = FilterService.getIntervalChoice();
  $scope.localTime = true;
  $scope.localOffset = moment().format('Z');

  if ($scope.interval.options && $scope.interval.options.startDate) {
    $scope.startDate = $scope.interval.options.startDate;
  } else {
    $scope.startDate = moment().startOf('day').toDate();
  }
  if ($scope.interval.options && $scope.interval.options.endDate) {
    $scope.endDate = $scope.interval.options.endDate;
  } else {
    $scope.endDate = moment().endOf('day').toDate();
  }

  $scope.startDatePopup = {open: false};
  $scope.endDatePopup = {open: false};

  $scope.onEventChange = function() {
    $scope.filterTeams = {};
  }

  $scope.performFilter = function() {
    var options = {};
    if ($scope.intervalChoice.filter === 'custom') {
      options.startDate = $scope.startDate;
      options.endDate = $scope.endDate;
      options.localTime = $scope.localTime;
    }

    FilterService.setFilter({
      event: $scope.filterEvent.selected,
      teams: $scope.filterTeams.selected,
      timeInterval: {
        choice: $scope.intervalChoice,
        options: options
      }
    });

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
