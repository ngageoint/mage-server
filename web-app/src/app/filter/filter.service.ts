import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { UserService } from "../user/user.service";
import { LocalStorageService } from "../http/local-storage.service";
import moment from 'moment';
import * as _ from "lodash";
import { User } from "@ngageoint/mage.web-core-lib/user";
import {
  Interval,
  FilterChoice,
  INTERVAL_CHOICES,
  Filter,
  SearchInterval,
} from "./filter.types";
import { Event, Form } from "../entities/event/entities.event";
import { Team, TeamById } from "../entities/team/entities.team";
import { Observation, FormProperties } from "../entities/observation/entities.observation";
import { filterChanges } from "../event/event.types";
import { SessionService } from "mage-web-app/http/session.service";

@Injectable({
  providedIn: "root",
})

export class FilterService {
  event: Event = null;
  teamsById: TeamById = {};
  users: User[] = [];
  forms: Form[] = [];

  interval: Interval = {};
  actionFilter: string = "";

  private eventSubject = new BehaviorSubject<Event | null>(null);
  private teamsSubject = new BehaviorSubject<Team[]>([]);
  private usersSubject = new BehaviorSubject<User[]>([]);
  private formsSubject = new BehaviorSubject<Form[]>([]);
  private intervalSubject = new BehaviorSubject<Interval>(this.interval);
  private actionFilterSubject = new BehaviorSubject<string>("");

  readonly event$: Observable<Event | null> = this.eventSubject.asObservable();
  readonly teams$: Observable<Team[]> = this.teamsSubject.asObservable();
  readonly users$: Observable<User[]> = this.usersSubject.asObservable();
  readonly forms$: Observable<Form[]> = this.formsSubject.asObservable();
  readonly interval$: Observable<Interval> = this.intervalSubject.asObservable();
  readonly actionFilter$: Observable<string> = this.actionFilterSubject.asObservable();

  intervalChoices: FilterChoice[] = INTERVAL_CHOICES;

  constructor(
    private userService: UserService,
    private sessionService: SessionService,
    private localStorageService: LocalStorageService
  ) {
    this.setTimeInterval(
      localStorageService.getTimeInterval() || {
        choice: this.intervalChoices[1],
      }
    );
  }

  /**
   * Updates the Observation Filter With the Selected Items
   * @param  {Filter} filter Contains the Selected Filter Values
   * @return {void} No Return
   */

  setFilter(filter: Filter): void {
    if (filter.users) this.setUsers(filter.users);

    if (filter.forms) this.setForms(filter.forms);

    if (filter.teams) {
      this.setTeams(filter.teams);
    }

    if (filter.event) {
      this.setEvent(filter.event);

      // if they changed the event, and didn't set teams filter
      // then reset teams filter to empty array
      if (!filter.teams) {
        let oldTeamIds = this.localStorageService.getTeams() || [];
        const teams = [];
        for (let i = 0; i < filter.event.teams.length; i++) {
          if (oldTeamIds.indexOf(this.event.teams[i].id) != -1) {
            teams.push(this.event.teams[i]);
          }
        }
        this.setTeams(teams);
      }
    }

    if (filter.actionFilter) {
      this.actionFilter = filter.actionFilter;
      this.actionFilterSubject.next(this.actionFilter);
    }

    if (filter.timeInterval) {
      this.setTimeInterval(filter.timeInterval);
    }
  }

  removeFilters() {
    if (this.event) {
      this.event = null;
      this.eventSubject.next(this.event);
    }
  }

  /**
   * Updates the Event Selected
   * @param  {Event} newEvent the new Event Selection
   * @return {filterChanges} a List of events added/removed from the list
   */

  setEvent(newEvent: Event): filterChanges {
    if (!newEvent && this.event) {
      const removed = [this.event];
      this.event = null;
      this.eventSubject.next(this.event);

      return {
        added: [],
        removed: removed,
      };
    } else if ((newEvent && !this.event) || this.event.id !== newEvent.id) {
      const added = [newEvent];
      const removed = this.event ? [this.event] : [];

      this.userService.addRecentEvent(newEvent).subscribe({
        error: (e) => console.error("Error adding recent event", e),
      });

      this.event = newEvent;
      this.eventSubject.next(this.event);

      return {
        added: added,
        removed: removed,
      };
    } else {
      return null;
    }
  }

  getEvent(): Event {
    return this.event;
  }

  /**
   * Updates the List of Users in the Selected Event
   * @param  {User[]} newUser the new List of Users that are in the events
   * @return {filterChanges} a List of users added and removed from the list
   */

  setUsers(newUsers: User[]): filterChanges {
    const added = [];
    const removed = [];

    newUsers.forEach((user: User) => {
      if (this.users.findIndex((u) => u.id === user.id) < 0) added.push(user);
    });

    this.users.forEach((user: User) => {
      if (newUsers.findIndex((u) => u.id === user.id) < 0) removed.push(user);
    });

    this.users = newUsers;
    this.localStorageService.setUsers(this.users);
    this.usersSubject.next(this.users);

    return {
      added: added,
      removed: removed,
    };
  }

  /**
   * Updates the List of Forms in the Selected Event
   * @param  {Form[]} newForms the new List of Forms that are in the events
   * @return {filterChanges} a List of forms added and removed from the list
   */

  setForms(newForms: Form[]): filterChanges {
    const added = [];
    const removed = [];

    newForms.forEach((form: Form) => {
      if (this.forms.findIndex((f) => f.id === form.id) < 0) added.push(form);
    });

    this.forms.forEach((form: Form) => {
      if (newForms.findIndex((f) => f.id === form.id) < 0) removed.push(form);
    });

    this.forms = newForms;
    this.localStorageService.setForms(this.forms);
    this.formsSubject.next(this.forms);

    return {
      added: added,
      removed: removed,
    };
  }

  /**
   * Updates the List of Teams in the Selected Event
   * @param  {Team[]} newTeams the new List of Teams that are in the events
   * @return {filterChanges} a List of teams added and removed from the list
   */

  setTeams(newTeams: Team[]): filterChanges {
    const added = [];
    const removed = [];

    newTeams.forEach((team: Team) => {
      if (!this.teamsById[team.id]) {
        added.push(team);
      }
    });

    let newTeamsById = _.keyBy(newTeams, "id");
    Object.values(this.teamsById).forEach((team: Team) => {
      if (!newTeamsById[team.id]) {
        removed.push(team);
      }
    });

    this.teamsById = newTeamsById;
    this.localStorageService.setTeams(Object.keys(this.teamsById));
    this.teamsSubject.next(this.getTeams());

    return {
      added: added,
      removed: removed,
    };
  }

  getTeams() {
    return Object.values(this.teamsById);
  }

  getUsers() {
    return this.users;
  }

  getForms() {
    return this.forms;
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

  /**
   * Sets the Time Interval if a change was made
   * @param  {Interval} newInterval Contains the Selected Interval Type and Custom Information
   * @return {boolean} If a change was made, returns True, else False
   */

  setTimeInterval(newInterval: Interval): boolean {
    if (newInterval.choice.filter === "custom") {
      if (
        this.interval.options?.startDate &&
        newInterval.options.startDate === this.interval.options?.startDate &&
        this.interval.options?.endDate &&
        newInterval.options.endDate === this.interval.options?.endDate
      ) {
        return false;
      }
    } else if (this.interval.choice === newInterval.choice) {
      return false;
    }
    this.localStorageService.setTimeInterval(newInterval);
    this.interval = newInterval;
    this.intervalSubject.next(this.interval);
    return true;
  }

  /**
   * Checks to see if the ID is within the list of filters Users
   * @param  {Observation} o The Current Observation
   * @return {boolean} Returns True if Observation is Allowed, or False if Not
   */

  observationInFilter(o: Observation): boolean {
    if (!this.isObservationInTimeFilter(o)) return false;

    if (!this.isUserInTeamFilter(o.userId)) return false;

    if (this.forms.length > 0 && !this.hasFormInList(o.properties.forms))
      return false;

    if (this.users.length > 0 && !this.isUserInList(o.userId)) return false;

    // remove observations that are not part of action filter
    if (this.actionFilter === "important" && !o.important) return false;

    if (
      this.actionFilter === "favorite" &&
      !o.favoriteUserIds.includes(this.sessionService.user.id)
    )
      return false;

    if (this.actionFilter === "attachments" && !o.attachments.length)
      return false;

    return true;
  }

  /**
   * Checks to see if the ID is within the list of filters Users
   * @param  {string} observationUserId Observations User ID
   * @return {boolean} Returns True if Observation is Allowed, or False if Not
   */

  isUserInList(observationUserId?: string): boolean {
    if (this.users.length <= 0) return true;
    return this.users.findIndex((u) => u.id === observationUserId) >= 0;
  }

  /**
   * Checks Incoming Observation to see if it has Forms within the Filter List
   * @param  {FormProperties[]} observationForms The Current Observations Forms
   * @return {boolean} Returns True if Observation is Allowed, or False if Not
   */

  hasFormInList(observationForms: FormProperties[]): boolean {
    if (this.forms.length <= 0) return true;
    const intersection = this.forms
      .map((x) => x.id)
      .filter((fID) => observationForms.map((y) => y.formId).includes(fID));
    return intersection.length > 0;
  }

  /**
   * Checks Incoming Observation to Make Sure it is Within the Time Constraints
   * @param  {Observation} o The Current Observation
   * @return {boolean} Returns True if Observation is Allowed, or False if Not
   */

  isObservationInTimeFilter(o: Observation): boolean {
    const time: SearchInterval = this.formatInterval(this.interval);
    if (time) {
      const properties = o.properties;
      if (time?.start && time?.end) {
        return moment(properties.timestamp).isBetween(time.start, time.end);
      } else if (time?.start) {
        return moment(properties.timestamp).isAfter(time.start);
      } else if (time?.end) {
        return moment(properties.timestamp).isBefore(time.start);
      }
    }
    return true;
  }

  /**
   * Checks to see if the declared username is filtered Team selections
   * @param  {string} userId the unique ID of the User who Created the Observation
   * @return {boolean} Returns True if Observation is Allowed, or False if Not
   */

  isUserInTeamFilter(userId?: string): boolean {
    if (Object.keys(this.teamsById).length === 0) return true;
    return Object.values(this.teamsById).some((team: Team) =>
      team.userIds.includes(userId)
    );
  }

  /**
   * Calculates and Returns the Start and End Time for Selected Interval
   * @param  {Interval} interval Contains the Selected Interval Type and Custom Information
   * @return {SearchInterval} A Start and End Value to Compare DateTimes to
   */

  formatInterval(interval: Interval): SearchInterval  {
    if (!interval) return null;
    const choice = interval.choice;
    const options = interval.options;
    let start: string = null;
    let end: string = null;

    if (choice.filter === "all") {
      return null;
    } else if (choice.filter === "today") {
      start = moment().startOf("day").toISOString();
      end = moment().endOf("day").toISOString();
    } else if (choice.filter === "custom") {
      let startDate = moment(options.startDate);
      if (startDate) {
        startDate = options.localTime ? startDate.utc() : startDate;
        start = startDate.utc().toISOString();
      }
      let endDate = moment(options.endDate);
      if (endDate) {
        endDate = options.localTime ? endDate.utc() : endDate;
        end = endDate.utc().toISOString();
      }
    } else {
      start = moment()
        .utc()
        .subtract(
          typeof choice.filter === "string"
            ? parseInt(choice.filter)
            : choice.filter,
          "seconds"
        )
        .toISOString();
      end = moment().toISOString();
    }

    return { start: start, end: end };
  }
}
