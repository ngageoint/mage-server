angular
  .module('mage')
  .factory('FilterService', FilterService);

FilterService.$inject = ['$rootScope', 'UserService'];

function FilterService($rootScope, UserService) {
  var event = null;
  var interval = null;
  var listeners = [];

  var timeInterval = {};
  var filterLocalOffset = moment().format('Z');

  var intervals = [{
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
  setTimeInterval(intervals[0]);

  var ***REMOVED*** = {
    intervals: intervals,
    addListener: addListener,
    removeListener: removeListener,
    setEvent: setEvent,
    getEvent: getEvent,
    formatInterval: formatInterval,
    getTimeInterval: getTimeInterval
  };

  return ***REMOVED***;

  function addListener(listener) {
    listeners.push(listener);

    if (event && _.isFunction(listener.onEventChanged)) {
      listener.onEventChanged(event);
    }

    if (interval && _.isFunction(listener.onTimeIntervalChanged)) {
      listener.onTimeIntervalChanged(interval);
    }
  }

  function removeListener(listener) {
    listeners = _.reject(listeners, function(l) { return l === listener });
  }

  function setEvent(newEvent) {
    if (event && event.id === newEvent.id) return;

    eventChanged({
      added: [newEvent],
      removed: event ? [event] : []
    });

    event = newEvent;

    // Tell server that user is using this event
    UserService.addRecentEvent(event);
  };

  function getEvent() {
    return event;
  }

  function formatInterval(interval) {
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

  function getTimeInterval() {
    return interval;
  };

  function setTimeInterval(newInterval, options) {
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
}
