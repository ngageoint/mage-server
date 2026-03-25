import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FilterService } from './filter.service';
import { EventService } from '../event/event.service';
import { FormControl } from '@angular/forms';
import {
  Observable,
  firstValueFrom,
  map,
  startWith,
  debounceTime,
  switchMap,
  of
} from 'rxjs';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { LocalStorageService } from '../http/local-storage.service';
import moment from 'moment';
import { User } from '@ngageoint/mage.web-core-lib/user';
import {
  Form,
  Team,
  Event,
  FilterChoice,
  Interval,
  IntervalOptions
} from './filter.types';

@Component({
  selector: 'filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
  encapsulation: ViewEncapsulation.None
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

  filteredEvents: Observable<Event[]> = of([]);
  filteredTeams: Observable<Team[]> = of([]);
  filteredUsers: Observable<User[]> = of([]);
  filteredForms: Observable<Form[]> = of([]);

  timeZone: string;
  localOffset: string;
  interval: Interval;
  defaultStartDate: Date;
  startDate: Date;
  defaultEndDate: Date;
  endDate: Date;
  intervalChoice: FilterChoice;
  intervalChoices: FilterChoice[];

  isLoading = true;

  constructor(
    public dialogRef: MatDialogRef<FilterComponent>,
    private eventService: EventService,
    private filterService: FilterService,
    private localStorageService: LocalStorageService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
  
    try {
      const event: Event = this.filterService.getEvent();
      this.eventControl.setValue(event);
  
      const teamIds = this.localStorageService.getTeams() || [];
      this.selectedTeams = teamIds
        .map((teamId: number) =>
          event.teams?.find((team: Team) => team.id === teamId)
        )
        .filter(Boolean);
  
      const users: User[] = this.localStorageService.getUsers() || [];
      const forms: Form[] = this.localStorageService.getForms() || [];
      this.selectedUsers = users;
      this.selectedForms = forms;
  
      const eUsers = await this.getUsers(event);
      this.eventUsers = eUsers;
  
      if (this.eventUsers.length > 0) {
        this.userControl.enable({ emitEvent: false });
      } else {
        this.userControl.disable({ emitEvent: false });
      }
  
      this.eventForms = event.forms || [];
  
      if (this.eventForms.length > 0) {
        this.formControl.enable({ emitEvent: false });
      } else {
        this.formControl.disable({ emitEvent: false });
      }
  
      if (event.teams?.length > 0) {
        this.teamControl.enable({ emitEvent: false });
      } else {
        this.teamControl.disable({ emitEvent: false });
      }
  
      this.interval = this.filterService.getInterval();
      this.timeZone =
        this.interval?.options?.localTime === false ? 'gmt' : 'local';
      this.intervalChoice = this.interval.choice;
      this.intervalChoices = this.filterService.intervalChoices;
  
      this.defaultStartDate = this.interval?.options?.startDate
        ? this.interval.options.startDate
        : moment().startOf('day').toDate();
  
      this.defaultEndDate = this.interval?.options?.endDate
        ? this.interval.options.endDate
        : moment().endOf('day').toDate();
  
      this.localOffset = moment().format('Z');
  
      const events = await firstValueFrom(this.eventService.query());
      this.setFilteredValues(events, this.eventUsers, this.eventForms);
    } finally {
      this.isLoading = false;
    }
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
      startWith(''),
      debounceTime(300),
      switchMap((value) => {
        const searchTerm =
          typeof value === 'string' ? value : value?.name || '';
        if (searchTerm && searchTerm.trim()) {
          return this.eventService.query({
            term: searchTerm.trim(),
            limit: 100
          });
        } else {
          return of(this.events);
        }
      })
    );

    this.filteredTeams = this.teamControl.valueChanges.pipe(
      startWith(''),
      map((value) => (typeof value === 'string' ? value : value.name)),
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
      startWith(''),
      map((value) =>
        typeof value === 'string' ? value : value.displayName || value.username
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
      startWith(''),
      map((value) => (typeof value === 'string' ? value : value.name)),
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
    this.isLoading = true;
  
    try {
      this.selectedTeams = [];
      this.selectedUsers = [];
      this.selectedForms = [];
      this.teamControl.setValue('');
      this.userControl.setValue('');
      this.formControl.setValue('');
  
      const newEvent: Event = event.option.value;
      const eUsers = await this.getUsers(newEvent);
  
      this.eventUsers = eUsers;
      this.eventForms = newEvent.forms || [];
  
      if (this.eventUsers.length > 0) {
        this.userControl.enable({ emitEvent: false });
      } else {
        this.userControl.disable({ emitEvent: false });
      }
  
      if (this.eventForms.length > 0) {
        this.formControl.enable({ emitEvent: false });
      } else {
        this.formControl.disable({ emitEvent: false });
      }
  
      if (newEvent.teams?.length > 0) {
        this.teamControl.enable({ emitEvent: false });
      } else {
        this.teamControl.disable({ emitEvent: false });
      }
  
      const events = await firstValueFrom(this.eventService.query());
      this.setFilteredValues(events, eUsers, this.eventForms);
    } finally {
      this.isLoading = false;
    }
  }

  onDisplayEvent(event: Event): string {
    return event && event.name ? event.name : '';
  }

  private filterEvent(name: string): Event[] {
    const filterValue = name.toLowerCase();
    return this.events.filter((option) =>
      option.name.toLowerCase().includes(filterValue)
    );
  }

  onSelectTeam(event: MatAutocompleteSelectedEvent): void {
    this.selectedTeams.push(event.option.value);
    this.teamControl.setValue('');
  }

  onSelectUser(event: MatAutocompleteSelectedEvent): void {
    this.selectedUsers.push(event.option.value);
    this.userControl.setValue('');
  }

  onSelectForm(event: MatAutocompleteSelectedEvent): void {
    this.selectedForms.push(event.option.value);
    this.formControl.setValue('');
  }

  onRemoveTeam(team: Team): void {
    this.selectedTeams = this.selectedTeams.filter(
      (selectedTeam: Team) => team.name !== selectedTeam.name
    );
    this.teamControl.setValue('');
  }

  onRemoveUser(user: User): void {
    this.selectedUsers = this.selectedUsers.filter(
      (selectedUser: User) =>
        (user.displayName || user.username) !==
        (selectedUser.displayName || selectedUser.username)
    );
    this.userControl.setValue('');
  }

  onRemoveForm(form: Form): void {
    this.selectedForms = this.selectedForms.filter(
      (selectedForm: Form) => form.name !== selectedForm.name
    );
    this.formControl.setValue('');
  }

  onDisplayTeam(team: Team): string {
    return team && team.name ? team.name : '';
  }

  onDisplayUser(user: User): string {
    return user && user.displayName ? user.displayName || user.username : '';
  }

  onDisplayForm(form: Form): string {
    return form && form.name ? form.name : '';
  }

  onStartDate(date: Date): void {
    this.startDate = date;
  }

  onEndDate(date: Date): void {
    this.endDate = date;
  }

  onTimezone(): void {
    this.timeZone = this.timeZone === 'gmt' ? 'local' : 'gmt';
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
    if (this.intervalChoice.filter === 'custom') {
      options.startDate = this.startDate;
      options.endDate = this.endDate;
      options.localTime = this.timeZone === 'local';
    }

    this.filterService.setFilter({
      event: this.eventControl.value,
      teams: this.selectedTeams,
      timeInterval: {
        choice: this.intervalChoice,
        options: options
      },
      users: this.selectedUsers,
      forms: this.selectedForms
    });

    this.dialogRef.close();
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
