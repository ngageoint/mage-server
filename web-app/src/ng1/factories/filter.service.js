var _ = require('underscore')
  , moment = require('moment');

module.exports = FilterService;

FilterService.$inject = ['UserService', 'LocalStorageService'];

function FilterService(UserService, LocalStorageService) {
  var event = null;
  var teamsById = {};
  var listeners = [];

  var interval = {};
  var filterLocalOffset = moment().format('Z');
  var actionFilter = {};

  var intervalChoices = [{
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

  setTimeInterval(LocalStorageService.getTimeInterval() || {choice: intervalChoices[1]});
  filterChanged({intervalChoice: interval.choice});

  var service = {
    intervals: intervalChoices,
    addListener: addListener,
    removeListener: removeListener,
    setFilter: setFilter,
    removeFilters: removeFilters,
    observationInFilter: observationInFilter,
    isUserInTeamFilter: isUserInTeamFilter,
    getEvent: getEvent,
    getTeams: getTeams,
    getTeamsById: getTeamsById,
    formatInterval: formatInterval,
    getInterval: getInterval,
    getIntervalChoice: getIntervalChoice
  };

  return service;

  function addListener(listener) {
    listeners.push(listener);

    if (_.isFunction(listener.onFilterChanged)) {
      listener.onFilterChanged({
        event: event,
        teams: _.values(teamsById),
        timeInterval: {
          choice: interval.choice
        }
      });
    }
  }

  function removeListener(listener) {
    listeners = _.reject(listeners, function(l) { return l === listener; });
  }

  function setFilter(filter) {
    var eventChanged = null;
    var teamsChanged = null;
    var timeIntervalChanged = null;
    var actionFilterChanged = null;

    if (filter.teams) {
      teamsChanged = setTeams(filter.teams);
    }

    if (filter.event) {
      eventChanged = setEvent(filter.event);

      // if they changed the event, and didn't set teams filter
      // then reset teams filter to empty array
      if (!filter.teams) {
        var oldTeamIds = LocalStorageService.getTeams() || [];
        var teams = [];
        for (var i = 0; i < filter.event.teams.length; i++) {
          if (oldTeamIds.indexOf(event.teams[i].id) != -1) {
            teams.push(event.teams[i]);
          }
        }
        teamsChanged = setTeams(teams);
      }
    }

    if (filter.actionFilter) {
      actionFilterChanged = filter.actionFilter;
      actionFilter = filter.actionFilter;
    }

    if (filter.timeInterval && setTimeInterval(filter.timeInterval)) {
      timeIntervalChanged = filter.timeInterval;
    }

    var changed = {};
    if (eventChanged) changed.event = eventChanged;
    if (teamsChanged) changed.teams = teamsChanged;
    if (actionFilterChanged) changed.actionFilter = actionFilterChanged;
    if (timeIntervalChanged) changed.timeInterval = timeIntervalChanged;

    filterChanged(changed);
  }

  function removeFilters() {
    var changed = {};
    if (event) {
      changed.event = {removed: [event]};
      event = null;
    }

    filterChanged(changed);
  }

  function setEvent(newEvent) {
    if (!newEvent && event) {
      event = null;

      return {
        added: [],
        removed: [event]
      };
    } else if (newEvent && !event || event.id !== newEvent.id) {
      var added = [newEvent];
      var removed = event ? [event] : [];

      // Tell server that user is using this event
      UserService.addRecentEvent(newEvent);

      event = newEvent;

      return {
        added: added,
        removed: removed
      };
    } else {
      return null;
    }
  }

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

    var newTeamsById = _.indexBy(newTeams, 'id');
    _.each(teamsById, function(team) {
      if (!newTeamsById[team.id]) {
        removed.push(team);
      }
    });

    teamsById = newTeamsById;
    LocalStorageService.setTeams(_.keys(teamsById));

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

  function getIntervalChoice() {
    return interval.choice;
  }

  function getInterval() {
    return interval;
  }

  function setTimeInterval(newInterval) {
    if (newInterval.choice.filter === 'custom') {
      if (interval.startDate && newInterval.options.startDate === interval.options.startDate &&
          interval.endDate && newInterval.options.endDate === interval.options.endDate) {
        return false;
      }
    } else if (interval.choice === newInterval.choice) {
      return false;
    }
    LocalStorageService.setTimeInterval(newInterval);
    interval = newInterval;
    return true;
  }

  function observationInFilter(o) {
    if (!isUserInTeamFilter(o.userId)) {
      return false;
    }

    if (!isObservationInTimeFilter(o)) {
      return false;
    }

    // remove observations that are not part of action filter
    if (actionFilter === 'important' && !o.important) {
      return false;
    }

    if (actionFilter === 'favorite' && !_.contains(o.favoriteUserIds, UserService.myself.id)) {
      return false;
    }

    if (actionFilter === 'attachments' && !o.attachments.length) {
      return false;
    }

    return true;
  }

  function isObservationInTimeFilter(o) {
    var time = formatInterval(interval);
    if (time) {
      var properties = o.properties;
      if (time.start && time.end) {
        if (!moment(properties.timestamp).isBetween(time.start, time.end)) return false;
      } else if (time.start) {
        if (!moment(properties.timestamp).isAfter(time.start)) return false;
      } else if (time.end) {
        if (!moment(properties.timestamp).isBefore(time.start)) return false;
      }
    }

    return true;
  }

  function isUserInTeamFilter(userId) {
    if (_.isEmpty(teamsById)) return true;

    return _.some(teamsById, function(team) {
      return _.contains(team.userIds, userId);
    });
  }

  function formatInterval(interval) {
    if (!interval) return null;

    var choice = interval.choice;
    var options = interval.options;

    if (choice.filter === 'all') {
      return null;
    } else if (choice.filter === 'today') {
      return { start: moment().startOf('day').toISOString() };
    } else if (choice.filter === 'custom') {
      var startDate = moment(options.startDate);
      if (startDate) {
        startDate = options.localTime ? startDate.utc() : startDate;
        var start = startDate.utc().toISOString();
      }

      var endDate = moment(options.endDate);
      if (endDate) {
        endDate = options.localTime ? endDate.utc() : endDate;
        var end = endDate.utc().toISOString();
      }

      return { start: start, end: end };
    } else {
      return { start: moment().utc().subtract('seconds', parseInt(choice.filter)).toISOString() };
    }
  }

  function filterChanged(filter) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onFilterChanged)) {
        listener.onFilterChanged(filter);
      }
    });
  }
}
