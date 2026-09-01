import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogRef as MatDialogRef } from '@angular/material/dialog';
import { FilterService } from './filter.service';
import { EventService } from '../event/event.service';
import { FormControl } from '@angular/forms';
import {
  Observable,
  firstValueFrom,
  map,
  startWith,
  of
} from 'rxjs';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatAutocompleteSelectedEvent as MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { LocalStorageService } from '../http/local-storage.service';
import moment from 'moment';
import { User } from '@ngageoint/mage.web-core-lib/user';
import {
  FilterChoice,
  Interval,
  IntervalOptions
} from './filter.types';
import { Event, Form } from '../entities/event/entities.event';
import { Team } from '../entities/team/entities.team';

@Component({
    selector: 'filter',
    templateUrl: './filter.component.html',
    styleUrls: ['./filter.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class FilterComponent implements OnInit {
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  event: Event;
  selectedTeams: Team[] = [];

  eventUsers: User[] = [];
  selectedUsers: User[] = [];

  eventForms: Form[] = [];
  selectedForms: Form[] = [];

  teamControl = new FormControl();
  userControl = new FormControl();
  formControl = new FormControl();

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
      this.event = event;

      const teamIds = this.localStorageService.getTeams() || [];
      this.selectedTeams = teamIds
        .map((teamId: string) =>
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

      this.setFilteredValues(this.eventUsers);
    } finally {
      this.isLoading = false;
    }
  }

  async getUsers(event: Event): Promise<User[]> {
    try {
      const users = await firstValueFrom(this.eventService.getMembers(event));
      return users;
    } catch (error) {
      console.error('Error Fetching Members ', error);
      return [];
    }
  }

  setFilteredValues(users: User[]): void {
    this.filteredTeams = this.teamControl.valueChanges.pipe(
      startWith(''),
      map((value) => (typeof value === 'string' ? value : value.name)),
      map((name) => this.event
        ? this.filterAutocomplete(this.event.teams || [], this.selectedTeams, name, (team) => team.name || '')
        : []
      )
    );

    this.filteredUsers = this.userControl.valueChanges.pipe(
      startWith(''),
      map((value) =>
        typeof value === 'string' ? value : value.displayName || value.username
      ),
      map((name) => this.filterAutocomplete(
        users, this.selectedUsers, name, (user) => user.displayName || user.username, (user) => user.id
      ))
    );

    this.filteredForms = this.formControl.valueChanges.pipe(
      startWith(''),
      map((value) => (typeof value === 'string' ? value : value.name)),
      map((name) => this.filterAutocomplete(
        this.eventForms, this.selectedForms, name, (form) => form.name, (form) => form.id
      ))
    );
  }

  /**
   * Narrows a picker's remaining options to those not already selected, and
   * to those matching the current search text by name prefix.
   */
  private filterAutocomplete<T>(
    items: T[],
    selected: T[],
    name: string,
    getName: (item: T) => string,
    getId: (item: T) => unknown = (item) => item
  ): T[] {
    const selectedIds = selected.map(getId);
    const available = items.filter((item) => !selectedIds.includes(getId(item)));
    const query = (name || '').toLowerCase();
    return query
      ? available.filter((item) => getName(item).toLowerCase().startsWith(query))
      : available;
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
