import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { FilterService } from "./filter.service";
import { EventService } from "../event/event.service";
import { FormControl } from "@angular/forms";
import { Observable, firstValueFrom, map, startWith, take } from "rxjs";
import { COMMA, ENTER } from "@angular/cdk/keycodes";
import { MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { LocalStorageService } from "../http/local-storage.service";
import * as moment from "moment";
import { User } from "@ngageoint/mage.web-core-lib/user";
import {
  Form,
  Team,
  Event,
  FilterChoice,
  Interval,
  IntervalOptions,
} from "./filter.types";

@Component({
  selector: "filter",
  templateUrl: "./filter.component.html",
  styleUrls: ["./filter.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class FilterComponent implements OnInit {
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  events: Event[];
  selectedTeams: Team[] = [];

  eventUsers: User[] = [];
  selectedUsers: User[] = [];

  eventForms: Form[] = [];
  selectedForms: Form[] = [];

  eventControl = new FormControl();
  teamControl = new FormControl();
  userControl = new FormControl();
  formControl = new FormControl();

  filteredEvents: Observable<Event[]>;
  filteredTeams: Observable<Team[]>;
  filteredUsers: Observable<User[]>;
  filteredForms: Observable<Form[]>;

  timeZone: string;
  localOffset: string;
  interval: Interval;
  defaultStartDate: Date;
  startDate: Date;
  defaultEndDate: Date;
  endDate: Date;
  intervalChoice: FilterChoice;
  intervalChoices: FilterChoice[];

  constructor(
    public dialogRef: MatDialogRef<FilterComponent>,
    private eventService: EventService,
    private filterService: FilterService,
    private localStorageService: LocalStorageService
  ) {}

  async ngOnInit() {
    const event: Event = this.filterService.getEvent();
    this.eventControl.setValue(event);
    const teamIds = this.localStorageService.getTeams() || [];
    this.selectedTeams = teamIds.map((teamId: number) => {
      return event.teams.find((team: Team) => team.id === teamId);
    });
    const users: User[] = this.localStorageService.getUsers() || [];
    const forms: Form[] = this.localStorageService.getForms() || [];
    this.selectedUsers = users;
    this.selectedForms = forms;
    if (!this.eventUsers.length) {
      let eUsers = await this.getUsers(event);
      if (eUsers.length > 0)
        this.eventUsers.push(...eUsers);
      else
        this.userControl.disable({ emitEvent: false });
    }
    if (!this.eventForms.length && event.forms) this.eventForms = event.forms;
    else if (!this.eventForms.length) this.formControl.disable({ emitEvent: false });

    if (this.eventControl.value.teams && this.eventControl.value.teams.length <= 0)
      this.teamControl.disable({ emitEvent: false });

    this.interval = this.filterService.getInterval();
    this.timeZone =
      this.interval.options?.localTime === false ? "gmt" : "local";
    this.intervalChoice = this.interval.choice;
    this.intervalChoices = this.filterService.intervalChoices;
    if (this.interval?.options && this.interval?.options?.startDate) {
      this.defaultStartDate = this.interval?.options?.startDate;
    } else {
      this.defaultStartDate = moment().startOf("day").toDate();
    }

    if (this.interval?.options && this.interval?.options?.endDate) {
      this.defaultEndDate = this.interval.options.endDate;
    } else {
      this.defaultEndDate = moment().endOf("day").toDate();
    }

    this.localOffset = moment().format("Z");

    this.eventService.query().subscribe((events: Event[]) => {
      this.setFilteredValues(events, this.eventUsers, this.eventForms);
    });
  }

  /**
   * Fetches Users for Given Event
   * @param  {Event} event Event to Get Users From
   * @return {Promise<User[]>} Returns List of Users as an Async Promise
   */
  async getUsers(event: Event): Promise<User[]> {
    try {
      const users = await firstValueFrom(this.eventService.getMembers(event));
      return users;
    } catch (error) {
      console.error('Error Fetching Members ', error);
      return [];
    }
  }
  
  /**
   * Resets Filter When Event is Selected
   * @param  {Event[]} events List of Events
   * @param  {User[]} eUsers Users in the Event
   * @param  {Form[]} eForms Forms in the Event
   * @return {void} No Return
   */

  setFilteredValues(events: Event[], eUsers: User[], eForms: Form[]): void {
    this.events = events;

    this.filteredEvents = this.eventControl.valueChanges.pipe(
      startWith(""),
      map((value) => (typeof value === "string" ? value : value.name)),
      map((name) => (name ? this.filterEvent(name) : this.events.slice()))
    );

    this.filteredTeams = this.teamControl.valueChanges.pipe(
      startWith(""),
      map((value) => (typeof value === "string" ? value : value.name)),
      map((name) => {
        if (this.eventControl.value) {
          let teams = this.eventControl.value.teams.filter(
            (team) => this.selectedTeams.indexOf(team) < 0
          );
          if (name) {
            const filterValue = name.toLowerCase();
            return teams.filter(
              (team: Team) => team.name.toLowerCase().indexOf(filterValue) === 0
            );
          } else {
            return teams.slice();
          }
        } else {
          return [];
        }
      })
    );

    this.filteredUsers = this.userControl.valueChanges.pipe(
      startWith(""),
      map((value) =>
        typeof value === "string" ? value : value.displayName || value.username
      ),
      map((name) => {
        if (eUsers.length) {
          let usersList = eUsers.filter(
            (user) => this.selectedUsers.map((x) => x.id).indexOf(user.id) < 0
          );
          if (name) {
            const filterValue = name.toLowerCase();
            return usersList.filter(
              (user: User) =>
                (user.displayName || user.username)
                  .toLowerCase()
                  .indexOf(filterValue) === 0
            );
          } else {
            return usersList.slice();
          }
        } else {
          return [];
        }
      })
    );

    this.filteredForms = this.formControl.valueChanges.pipe(
      startWith(""),
      map((value) => (typeof value === "string" ? value : value.name)),
      map((name) => {
        let formsList = this.eventForms.filter(
          (form) => this.selectedForms.map((x) => x.id).indexOf(form.id) < 0
        );
        if (eForms.length) {
          if (name) {
            const filterValue = name.toLowerCase();
            return formsList.filter(
              (form: Form) => form.name.toLowerCase().indexOf(filterValue) === 0
            );
          } else {
            return formsList.slice();
          }
        } else {
          return [];
        }
      })
    );
  }

  /**
   * Resets Filter When Event is Selected
   * @param  {MatAutocompleteSelectedEvent} event The Event from the Autocomplete SelectBox
   * @return {Promise<void>} No Return
   */

  async onSelectEvent(event: MatAutocompleteSelectedEvent): Promise<void> {
    this.selectedTeams = [];
    this.selectedUsers = [];
    this.selectedForms = [];
    this.teamControl.setValue("");
    this.userControl.setValue("");
    this.formControl.setValue("");

    let newEvent: Event = event.option.value;
    let eUsers = await this.getUsers(newEvent);

    this.eventUsers = eUsers;
    this.eventForms = newEvent.forms;

    if (this.eventUsers.length > 0) this.userControl.enable({ emitEvent: false });
    else this.userControl.disable({ emitEvent: false });
    
    if (newEvent.forms.length > 0) this.formControl.enable({ emitEvent: false });
    else this.formControl.disable({ emitEvent: false });

    if (this.eventControl.value.teams.length > 0) this.teamControl.enable({ emitEvent: false });
    else this.teamControl.disable({ emitEvent: false });

    if (this.events.length > 0)  this.eventControl.enable({ emitEvent: false });
    else this.eventControl.disable({ emitEvent: false });

    this.eventService.query().subscribe(async (events: Event[]) => {
      this.setFilteredValues(events, eUsers, newEvent.forms);
    });
  }

  onDisplayEvent(event: Event): string {
    return event && event.name ? event.name : "";
  }

  private filterEvent(name: string): Event[] {
    const filterValue = name.toLowerCase();
    return this.events.filter(
      (option) => option.name.toLowerCase().indexOf(filterValue) === 0
    );
  }

  onSelectTeam(event: MatAutocompleteSelectedEvent): void {
    this.selectedTeams.push(event.option.value);
    this.teamControl.setValue("");
  }

  onSelectUser(event: MatAutocompleteSelectedEvent): void {
    this.selectedUsers.push(event.option.value);
    this.userControl.setValue("");
  }

  onSelectForm(event: MatAutocompleteSelectedEvent): void {
    this.selectedForms.push(event.option.value);
    this.formControl.setValue("");
  }

  onRemoveTeam(team: Team): void {
    this.selectedTeams = this.selectedTeams.filter(
      (selectedTeam: Team) => team.name !== selectedTeam.name
    );
    this.teamControl.setValue("");
  }

  onRemoveUser(user: User): void {
    this.selectedUsers = this.selectedUsers.filter(
      (selectedUser: User) =>
        (user.displayName || user.username) !==
        (selectedUser.displayName || selectedUser.username)
    );
    this.userControl.setValue("");
  }

  onRemoveForm(form: Form): void {
    this.selectedForms = this.selectedForms.filter(
      (selectedForm: Form) => form.name !== selectedForm.name
    );
    this.formControl.setValue("");
  }

  onDisplayTeam(team: Team): string {
    return team && team.name ? team.name : "";
  }

  onDisplayUser(user: User): string {
    return user && user.displayName ? user.displayName || user.username : "";
  }

  onDisplayForm(form: Form): string {
    return form && form.name ? form.name : "";
  }

  onStartDate(date: Date): void {
    this.startDate = date;
  }

  onEndDate(date: Date): void {
    this.endDate = date;
  }

  onTimezone(): void {
    this.timeZone = this.timeZone === "gmt" ? "local" : "gmt";
  }

  public compareIntervalChoices = function (option, value): boolean {
    return option.label === value.label;
  };

  /**
   * Filters Observation List using the FilterService
   * @return {void} No Return
   */

  onFilter(): void {
    const options: IntervalOptions = {};
    if (this.intervalChoice.filter === "custom") {
      options.startDate = this.startDate;
      options.endDate = this.endDate;
      options.localTime = this.timeZone === "local";
    }

    this.filterService.setFilter({
      event: this.eventControl.value,
      teams: this.selectedTeams,
      timeInterval: {
        choice: this.intervalChoice,
        options: options,
      },
      users: this.selectedUsers,
      forms: this.selectedForms,
    });

    this.dialogRef.close();
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
