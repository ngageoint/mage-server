angular
  .module('mage')
  .factory('FilterService', FilterService);

FilterService.$inject = ['UserService'];

function FilterService(UserService) {
  var event = null;
  var teamsById = {};
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
  setTimeInterval(intervals[1]);

  var ***REMOVED*** = {
    intervals: intervals,
    addListener: addListener,
    removeListener: removeListener,
    setFilter: setFilter,
    getEvent: getEvent,
    getTeams: getTeams,
    getTeamsById: getTeamsById,
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

  function setFilter(filter) {
    eventChanged = null;
    teamsChanged = null;
    timeIntervalChanged = null;

    if (filter.event && !filter.teams) {
      eventChanged = setEvent(filter.event);
      teamsChanged = setTeams([]);
    }

    if (filter.teams) {
      teamsChanged = setTeams(filter.teams);
    }

    if (filter.timeInterval) {
      timeIntervalChanged = setTimeInterval(filter.timeInterval.interval, filter.timeInterval.options);
    }

    var changed = {};
    if (eventChanged) changed.event = eventChanged;
    if (teamsChanged) changed.teams = teamsChanged;
    if (timeIntervalChanged) changed.timeInterval = timeIntervalChanged;

    filterChanged(changed);
  }

  function setEvent(newEvent) {
    if (newEvent == null && event != null) {
      event = null;

      return {
        added: [],
        removed: [event]
      }
    } else if (newEvent && (!event || event.id !== newEvent.id)) {
      var added = [newEvent];
      var removed = event ? [event] : [];

      event = newEvent;

      // Tell server that user is using this event
      UserService.addRecentEvent(newEvent);

      return {
        added: added,
        removed: removed
      }
    } else {
      return null;
    }
  };

  function getEvent() {
    return event;
  }

  function setTeams(newTeams) {
    var added = [];
    var removed = [];

    _.each(newTeams, function(team) {
      if (!teamsById[team.id]) {
        added.push(team);
      }
    });

    newTeamsById = _.indexBy(newTeams, 'id');
    _.each(teamsById, function(team) {
      if (!newTeamsById[team.id]) {
        removed.push(team);
      }
    });

    teamsById = newTeamsById;

    return {
      added: added,
      removed: removed
    };
  }

  function getTeams() {
    return _.values(teamsById);
  }

  function getTeamsById() {
    return teamsById;
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
    if (interval != null && interval === newInterval) return null;

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

    return timeInterval;
  }

  function filterChanged(filter) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onFilterChanged)) {
        listener.onFilterChanged(filter);
      }
    });
  }

  // function eventChanged(event) {
  //   _.each(listeners, function(listener) {
  //     if (_.isFunction(listener.onEventChanged)) {
  //       listener.onEventChanged(event);
  //     }
  //   });
  // }
  //
  // function teamsChanged(changed) {
  //   _.each(listeners, function(listener) {
  //     if (_.isFunction(listener.onTeamsChanged)) {
  //       listener.onTeamsChanged(changed, event);
  //     }
  //   });
  // }
  //
  // function timeIntervalChanged(interval) {
  //   _.each(listeners, function(listener) {
  //     if (_.isFunction(listener.onTimeIntervalChanged)) {
  //       listener.onTimeIntervalChanged(interval);
  //     }
  //   });
  // }
}
