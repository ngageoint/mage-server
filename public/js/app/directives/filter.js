mage.directive('filter', function(FilterService, mageLib) {
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
          var startDate = moment($scope.filterStartDate).utc();
          if (startDate) {
            var startTime = $scope.filterStartTime || '00:00:00';
            var start;
            if ($scope.filterLocalTime) {
              start = moment(startDate.format("YYYY-MM-DD") + " " + startTime).utc().format("YYYY-MM-DD HH:mm:ss")
            } else {
              start = startDate.format("YYYY-MM-DD") + " " + startTime
            }
          }

          var endDate = moment($scope.filterEndDate).utc();
          if (endDate) {
            var endTime = $scope.filterEndTime || '23:59:59';
            var end = $scope.filterLocalTime ? moment(endDate.format("YYYY-MM-DD") + " " + endTime).utc().format("YYYY-MM-DD HH:mm:ss") : endDate.format("YYYY-MM-DD") + " " + endTime;
          }

          FilterService.setTimeInterval({start: start, end: end});
        } else {
          FilterService.setTimeInterval({ since: parseInt($scope.interval.filter) });
        }
      }

      $scope.intervals = [{
        filter: 'all',
        label: 'All'
      },{
        filter: 'today',
        label: 'Today'
      },{
        filter: 86400,
        label: 'Last 24 Hours'
      },{
        filter: 43200,
        label: 'Last 12 Hours'
      },{
        filter: 3600,
        label: 'Last Hour'
      },{
        filter: 'custom',
        label: 'Custom'
      }];

      $scope.interval = $scope.intervals[0];
      $scope.filterLocalTime = true;
      $scope.filterStartDate = moment().startOf('day').toDate();
      $scope.filterStartTime = '00:00:00';
      $scope.filterEndDate = moment().startOf('day').toDate();
      $scope.filterEndTime = '23:59:59';
    }
  }
});
