import { Injectable } from "@angular/core";
import { UserService } from "../user/user.service";
import { LocalStorageService } from "../http/local-storage.service";
import * as moment from 'moment';
import * as _ from 'lodash'

@Injectable({
  providedIn: 'root'
})
export class FilterService {

  event: any = null;
  teamsById: any = {};
  listeners: any = [];

  interval: any = {};
  filterLocalOffset = moment().format('Z');
  actionFilter: any = {};

  intervalChoices: any = [{
    filter: 'all',
    label: 'All'
  }, {
    filter: 'today',
    label: 'Today (Local GMT ' + this.filterLocalOffset + ')'
  }, {
    filter: 86400,
    label: 'Last 24 Hours'
  }, {
    filter: 43200,
    label: 'Last 12 Hours'
  }, {
    filter: 21600,
    label: 'Last 6 Hours'
  }, {
    filter: 3600,
    label: 'Last Hour'
  }, {
    filter: 'custom',
    label: 'Custom'
  }];

  constructor(
    private userService: UserService,
    private localStorageService: LocalStorageService
  ) {
    this.setTimeInterval(localStorageService.getTimeInterval() || { choice: this.intervalChoices[1] });
    this.filterChanged({ intervalChoice: this.interval.choice });
  }

  addListener(listener: any) {
    this.listeners.push(listener);

    if (typeof listener.onFilterChanged === 'function') {
      listener.onFilterChanged({
        event: this.event,
        teams: Object.values(this.teamsById),
        timeInterval: {
          choice: this.interval.choice
        }
      });
    }
  }

  removeListener(listener: any) {
    this.listeners = this.listeners.filter((l: any) => l !== listener );
  }

  setFilter(filter: any) {
    var eventChanged = null;
    var teamsChanged = null;
    var timeIntervalChanged = null;
    var actionFilterChanged = null;

    if (filter.teams) {
      teamsChanged = this.setTeams(filter.teams);
    }

    if (filter.event) {
      eventChanged = this.setEvent(filter.event);

      // if they changed the event, and didn't set teams filter
      // then reset teams filter to empty array
      if (!filter.teams) {
        var oldTeamIds = this.localStorageService.getTeams() || [];
        var teams = [];
        for (var i = 0; i < filter.event.teams.length; i++) {
          if (oldTeamIds.indexOf(this.event.teams[i].id) != -1) {
            teams.push(this.event.teams[i]);
          }
        }
        teamsChanged = this.setTeams(teams);
      }
    }

    if (filter.actionFilter) {
      actionFilterChanged = filter.actionFilter;
      this.actionFilter = filter.actionFilter;
    }

    if (filter.timeInterval && this.setTimeInterval(filter.timeInterval)) {
      timeIntervalChanged = filter.timeInterval;
    }

    var changed: any = {};
    if (eventChanged) changed.event = eventChanged;
    if (teamsChanged) changed.teams = teamsChanged;
    if (actionFilterChanged) changed.actionFilter = actionFilterChanged;
    if (timeIntervalChanged) changed.timeInterval = timeIntervalChanged;

    this.filterChanged(changed);
  }

  removeFilters() {
    var changed: any = {};
    if (this.event) {
      changed.event = { removed: [this.event] };
      this.event = null;
    }

    this.filterChanged(changed);
  }

  setEvent(newEvent: any) {
    if (!newEvent && this.event) {
      this.event = null;

      return {
        added: [],
        removed: [this.event]
      };
    } else if (newEvent && !this.event || this.event.id !== newEvent.id) {
      var added = [newEvent];
      var removed = this.event ? [this.event] : [];

      // Tell server that user is using this event
      this.userService.addRecentEvent(newEvent);

      this.event = newEvent;

      return {
        added: added,
        removed: removed
      };
    } else {
      return null;
    }
  }

  getEvent() {
    return this.event;
  }

  setTeams(newTeams: any) {
    var added = [];
    var removed = [];

    newTeams.forEach((team: any) => {
      if (!this.teamsById[team.id]) {
        added.push(team);
      }
    })

    var newTeamsById = _.keyBy(newTeams, 'id');
    Object.values(this.teamsById).forEach((team: any) => {
      if (!newTeamsById[team.id]) {
        removed.push(team);
      }
    });

    this.teamsById = newTeamsById;
    this.localStorageService.setTeams(Object.keys(this.teamsById));

    return {
      added: added,
      removed: removed
    };
  }

  getTeams() {
    return Object.values(this.teamsById);
  }

  getTeamsById() {
    return this.teamsById;
  }

  getIntervalChoice() {
    return this.interval.choice;
  }

  getInterval() {
    return this.interval;
  }

  setTimeInterval(newInterval: any) {
    if (newInterval.choice.filter === 'custom') {
      if (this.interval.startDate && newInterval.options.startDate === this.interval.options.startDate &&
        this.interval.endDate && newInterval.options.endDate === this.interval.options.endDate) {
        return false;
      }
    } else if (this.interval.choice === newInterval.choice) {
      return false;
    }
    this.localStorageService.setTimeInterval(newInterval);
    this.interval = newInterval;
    return true;
  }

  observationInFilter(o) {
    if (!this.isUserInTeamFilter(o.userId)) {
      return false;
    }

    if (!this.isObservationInTimeFilter(o)) {
      return false;
    }

    // remove observations that are not part of action filter
    if (this.actionFilter === 'important' && !o.important) {
      return false;
    }

    if (this.actionFilter === 'favorite' && !o.favoriteUserIds.includes(this.userService.myself.id)) {
      return false;
    }

    if (this.actionFilter === 'attachments' && !o.attachments.length) {
      return false;
    }

    return true;
  }

  isObservationInTimeFilter(o: any) {
    var time = this.formatInterval(this.interval);
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

  isUserInTeamFilter(userId: any) {
    if (Object.keys(this.teamsById).length === 0) return true
    return this.teamsById.some((team: any) => team.userIds.includes(userId))
  }

  formatInterval(interval: any) {
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

  filterChanged(filter: any) {
    this.listeners.forEach((listener: any) => {
      if (typeof listener.onFilterChanged === 'function') {
        listener.onFilterChanged(filter);
      }
    });
  }

}
