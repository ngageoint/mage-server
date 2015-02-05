'use strict';

mage.factory('FilterService', ['$rootScope', 'mageLib',
  function ($rootScope, mageLib) {
    var localStorageKey = 'FilterService.interval';

    var ***REMOVED*** = {};

    var event = null;

    ***REMOVED***.setEvent = function(newEvent) {
      event = newEvent;

      $rootScope.$broadcast('filter:event', event);
    }

    ***REMOVED***.getEvent = function() {
      return event;
    }

    ***REMOVED***.intervals = [{
      filter: 'all',
      label: 'All'
    },{
      filter: 'today',
      label: 'Today (Local GMT ' + filterLocalOffset + ')'
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

    var interval = ***REMOVED***.intervals[0];
    var timeInterval = {};
    var filterLocalOffset = moment().format('Z');

    ***REMOVED***.formatInterval = function() {
      if (interval.since != null) {
        return { start: moment().utc().subtract('seconds', interval.since).toISOString() };
      } else if (interval.today) {
        return { start: moment().startOf('day').toISOString() };
      } else if (interval.start || interval.end) {
        return { start: interval.start, end: interval.end };
      } else {
        return null;
      }
    }

    ***REMOVED***.getTimeInterval = function() {
      return interval;
    };

    ***REMOVED***.setTimeInterval = function(newInterval, options) {
      interval = newInterval;

      if (newInterval.filter === 'all') {
        timeInterval = null;
      } else if (newInterval.filter == 'today') {
        timeInterval = { today: true };
      } else if (newInterval.filter == 'custom') {
        var startDate = moment(options.filterStartDate);
        if (startDate) {
          startDate = options.filterLocalTime ? startDate.utc() : startDate;
          var start = startDate.format("YYYY-MM-DD HH:mm:ss");
        }

        var endDate = moment(options.filterEndDate);
        if (endDate) {
          endDate = options.filterLocalTime ? endDate.utc() : endDate;
          var end = endDate.format("YYYY-MM-DD HH:mm:ss");
        }

        timeInterval = {start: start, end: end};
      } else {
        timeInterval = { since: parseInt(newInterval.filter) }
      }

      $rootScope.$broadcast('filter:time', timeInterval);
    }

    return ***REMOVED***;
  }]);
