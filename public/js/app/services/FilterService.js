'use strict';

mage.factory('FilterService', ['$rootScope', 'UserService',
  function ($rootScope, UserService) {
    var localStorageKey = 'FilterService.interval';

    var ***REMOVED*** = {};

    var event = null;

    var listeners = [];
    function eventChanged(event) {
      _.each(listeners, function(listener) {
        if (_.isFunction(listener.onEventChanged)) {
          listener.onEventChanged(event);
        }
      });
    }

    function timeIntervalChanged(interval) {
      _.each(listeners, function(listener) {
        if (_.isFunction(listener.onTimeIntervalChanged)) {
          listener.onTimeIntervalChanged(interval);
        }
      });
    }

    ***REMOVED***.addListener = function(listener) {
      listeners.push(listener);

      if (event && _.isFunction(listener.onEventChanged)) {
        listener.onEventChanged(event);
      }

      if (interval && _.isFunction(listener.onTimeIntervalChanged)) {
        listener.onTimeIntervalChanged(interval);
      }
    }

    ***REMOVED***.setEvent = function(newEvent) {
      eventChanged({
        added: [newEvent],
        removed: event ? [event] : []
      });

      event = newEvent;

      // Tell server that user is using this event
      UserService.addRecentEvent(event);
    };

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

    ***REMOVED***.formatInterval = function(interval) {
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

    var interval = null;
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
        var startDate = moment(options.startDate);
        if (startDate) {
          startDate = options.localTime ? startDate.utc() : startDate;
          var start = startDate.format("YYYY-MM-DD HH:mm:ss");
        }

        var endDate = moment(options.endDate);
        if (endDate) {
          endDate = options.localTime ? endDate.utc() : endDate;
          var end = endDate.format("YYYY-MM-DD HH:mm:ss");
        }

        timeInterval = {start: start, end: end};
      } else {
        timeInterval = { since: parseInt(newInterval.filter) }
      }

      timeIntervalChanged(timeInterval);
    }

    ***REMOVED***.setTimeInterval(***REMOVED***.intervals[0]);
    var timeInterval = {};
    var filterLocalOffset = moment().format('Z');


    return ***REMOVED***;
  }]);
