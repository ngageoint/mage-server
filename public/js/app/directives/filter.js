// TODO do we still need this
mage.directive('filter', function(FilterService) {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/filter.html",
    controller: function($scope) {
      $scope.updateInterval = function() {
        if ($scope.interval.filter === 'all') {
          FilterService.setTimeInterval(null);
        } else if ($scope.interval.filter == 'today') {
          FilterService.setTimeInterval({ today: true });
        } else if ($scope.interval.filter == 'custom') {
          var startDate = moment($scope.filterStartDate);
          if (startDate) {
            startDate = $scope.filterLocalTime ? startDate.utc() : startDate;
            var start = startDate.format("YYYY-MM-DD HH:mm:ss");
          }

          var endDate = moment($scope.filterEndDate);
          if (endDate) {
            endDate = $scope.filterLocalTime ? endDate.utc() : endDate;
            var end = endDate.format("YYYY-MM-DD HH:mm:ss");
          }

          FilterService.setTimeInterval({start: start, end: end});
        } else {
          FilterService.setTimeInterval({ since: parseInt($scope.interval.filter) });
        }
      }


      $scope.filterLocalTime = true;
      $scope.filterLocalOffset = moment().format('Z');
      $scope.filterStartDate = moment().startOf('day').toDate();
      $scope.filterEndDate = moment().endOf('day').toDate();

      $scope.intervals = [{
        filter: 'all',
        label: 'All'
      },{
        filter: 'today',
        label: 'Today (Local GMT ' + $scope.filterLocalOffset + ')'
      },{
        filter: 86400,
        label: 'Last 24 Hours'
      },{
        filter: 43200,
        label: 'Last 12 Hours'
      },{
        filter: 21600,
        label: 'Last 6 Hours'
      },{
        filter: 3600,
        label: 'Last Hour'
      },{
        filter: 'custom',
        label: 'Custom'
      }];

      $scope.interval = $scope.intervals[0];
    }
  }
});
