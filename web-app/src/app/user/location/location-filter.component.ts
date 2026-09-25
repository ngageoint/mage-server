import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { DatetimePickerComponent } from '../../datetime-picker/datetime-picker.component'
import { FilterService } from '../../filter/filter.service'
import { EventMemberFilterComponent, MemberFilterSelection } from '../../event/event-member-filter.component'
import { FilterChoice, INTERVAL_CHOICES, Interval } from '../../filter/filter.types'
import moment from 'moment'

@Component({
  selector: 'location-filter',
  templateUrl: './location-filter.component.html',
  styleUrls: ['./location-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatetimePickerComponent,
    EventMemberFilterComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule
  ]
})
export class LocationFilterDialogComponent implements OnInit {
  mageEvent: any
  teams: any[]
  localOffset = moment().format('Z')

  intervalChoices = INTERVAL_CHOICES

  initialMemberFilter: MemberFilterSelection | null = null
  memberFilter: MemberFilterSelection | null = null
  timeZone = signal<'local' | 'gmt'>('local')
  intervalChoice = signal<FilterChoice>(this.intervalChoices[1])
  defaultStartDate: Date
  startDate: Date
  defaultEndDate: Date
  endDate: Date

  constructor(
    public dialogRef: MatDialogRef<LocationFilterDialogComponent>,
    private filterService: FilterService
  ) { }

  ngOnInit() {
    this.mageEvent = this.filterService.getEvent()
    this.teams = this.mageEvent?.teams

    const locationFilter = this.filterService.getLocationFilter()
    this.initialMemberFilter = locationFilter?.memberFilter ?? null
    this.memberFilter = this.initialMemberFilter

    const savedInterval = locationFilter?.timeInterval
    this.intervalChoice.set(savedInterval?.choice ?? this.intervalChoices[1])
    this.timeZone.set(savedInterval?.options?.localTime === false ? 'gmt' : 'local')
    this.defaultStartDate = savedInterval?.options?.startDate ?? moment().startOf('day').toDate()
    this.defaultEndDate = savedInterval?.options?.endDate ?? moment().endOf('day').toDate()
    this.startDate = this.defaultStartDate
    this.endDate = this.defaultEndDate
  }

  onMemberFilterChanged(selection: MemberFilterSelection): void {
    this.memberFilter = (selection.teamIds.length || selection.userIds.length) ? selection : null
  }

  onStartDate(date: Date): void {
    this.startDate = date
  }

  onEndDate(date: Date): void {
    this.endDate = date
  }

  onTimezone(): void {
    this.timeZone.update(timeZone => timeZone === 'gmt' ? 'local' : 'gmt')
  }

  public compareIntervalChoices = function (option: FilterChoice, value: FilterChoice): boolean {
    return option.filter === value.filter
  }

  onFilter(): void {
    this.filterService.setLocationFilter({
      timeInterval: this.timeInterval(),
      memberFilter: this.memberFilter,
    })
    this.dialogRef.close()
  }

  onCancel(): void {
    this.dialogRef.close()
  }

  private timeInterval(): Interval {
    const choice = this.intervalChoice()
    const localTime = this.timeZone() === 'local'
    if (choice.filter === 'custom') {
      return { choice, options: { startDate: this.startDate, endDate: this.endDate, localTime } }
    }
    return { choice }
  }
}
