import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FilterService } from './filter.service';
import { EventService } from '../event/event.service';
import { FormControl } from '@angular/forms';
import { Observable, map, startWith } from 'rxjs';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { LocalStorageService } from '../http/local-storage.service';
import * as moment from 'moment'

@Component({
  selector: 'filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FilterComponent implements OnInit {
  readonly separatorKeysCodes: number[] = [ENTER, COMMA]

  events: any[]
  selectedTeams: any[] = []

  eventControl = new FormControl()
  teamControl = new FormControl()

  filteredEvents: Observable<any[]>
  filteredTeams: Observable<any[]>

  timeZone: any
  localOffset: string
  interval: any
  defaultStartDate: Date
  startDate: Date
  defaultEndDate: Date
  endDate: Date
  intervalChoice: any
  intervalChoices: any

  constructor(
    public dialogRef: MatDialogRef<FilterComponent>,
    private eventService: EventService,
    private filterService: FilterService,
    private localStorageService: LocalStorageService
  ) { }

  ngOnInit() {
    const event = this.filterService.getEvent()
    this.eventControl.setValue(event)
    const teamIds = this.localStorageService.getTeams() || [];
    this.selectedTeams = teamIds.map((teamId: string) => {
      return event.teams.find((team: any) => team.id === teamId)
    })

    this.interval = this.filterService.getInterval()
    this.timeZone = this.interval.options?.localTime === false ? 'gmt' : 'local'
    this.intervalChoice = this.interval.choice
    this.intervalChoices = this.filterService.intervalChoices
    if (this.interval?.options && this.interval?.options?.startDate) {
      this.defaultStartDate = this.interval?.options?.startDate;
    } else {
      this.defaultStartDate = moment().startOf('day').toDate();
    }

    if (this.interval?.options && this.interval?.options?.endDate) {
      this.defaultEndDate = this.interval.options.endDate;
    } else {
      this.defaultEndDate = moment().endOf('day').toDate()
    }

    this.localOffset = moment().format('Z')

    this.eventService.query().subscribe((events: any) => {
      this.events = events

      this.filteredEvents = this.eventControl.valueChanges.pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : value.name),
        map(name => name ? this.filterEvent(name) : this.events.slice())
      )

      this.filteredTeams = this.teamControl.valueChanges.pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : value.name),
        map(name => {
          if (this.eventControl.value) {
            let teams = this.eventControl.value.teams.filter(team => this.selectedTeams.indexOf(team) < 0)
            if (name) {
              const filterValue = name.toLowerCase()
              return teams.filter((team: any) => team.name.toLowerCase().indexOf(filterValue) === 0)
            } else {
              return teams.slice()
            }
          } else {
            return []
          }
        })
      )
    })
  }

  onSelectEvent(): void {
    this.selectedTeams = []
    this.teamControl.setValue('')
  }

  onDisplayEvent(event: any): string {
    return event && event.name ? event.name : '';
  }

  private filterEvent(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.events.filter(option => option.name.toLowerCase().indexOf(filterValue) === 0);
  }

  onSelectTeam(event: MatAutocompleteSelectedEvent): void {
    this.selectedTeams.push(event.option.value)
    this.teamControl.setValue('')
  }

  onRemoveTeam(team: any): void {
    this.selectedTeams = this.selectedTeams.filter((selectedTeam: any) => team.name !== selectedTeam.name)
    this.teamControl.setValue('')
  }

  onDisplayTeam(team: any): string {
    return team && team.name ? team.name : '';
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
  }

  onFilter(): void {
    var options: any = {};
    if (this.intervalChoice.filter === 'custom') {
      options.startDate = this.startDate
      options.endDate = this.endDate
      options.localTime = this.timeZone === 'local'
    }

    this.filterService.setFilter({
      event: this.eventControl.value,
      teams: this.selectedTeams,
      timeInterval: {
        choice: this.intervalChoice,
        options: options
      }
    });

    this.dialogRef.close()
  }

  onCancel(): void {
    this.dialogRef.close();
  }

}