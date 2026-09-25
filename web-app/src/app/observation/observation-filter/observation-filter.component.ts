import { ChangeDetectionStrategy, Component, OnInit, signal, viewChild } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatSelectModule } from '@angular/material/select'
import { MatTooltipModule } from '@angular/material/tooltip'
import { DatetimePickerComponent } from '../../datetime-picker/datetime-picker.component'
import { FilterService } from '../../filter/filter.service'
import { EventMemberFilterComponent, MemberFilterSelection } from '../../event/event-member-filter.component'
import { Condition } from '../../entities/observation/filter/entities.observation.filter'
import { FilterChoice, INTERVAL_CHOICES, Interval } from '../../filter/filter.types'
import { ObservationFieldFilterComponent } from './observation-field-filter.component'
import moment from 'moment'

@Component({
  selector: 'observation-filter',
  templateUrl: './observation-filter.component.html',
  styleUrls: ['./observation-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatetimePickerComponent,
    EventMemberFilterComponent,
    ObservationFieldFilterComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule
  ]
})
export class ObservationFilterDialogComponent implements OnInit {
  fieldFilter = viewChild(ObservationFieldFilterComponent)

  mageEvent: any
  teams: any[]
  localOffset = moment().format('Z')

  intervalChoices = INTERVAL_CHOICES

  initialMemberFilter: MemberFilterSelection | null = null
  memberFilter: MemberFilterSelection | null = null
  hasAttachments = signal(false)
  isUserFavorite = signal(false)
  isFlaggedImportant = signal(false)
  condition = signal<Condition | undefined>(undefined)
  showIncompleteConditionError = signal(false)
  timeZone = signal<'local' | 'gmt'>('local')
  intervalChoice = signal<FilterChoice>(this.intervalChoices[1])
  defaultStartDate: Date
  startDate: Date
  defaultEndDate: Date
  endDate: Date

  constructor(
    public dialogRef: MatDialogRef<ObservationFilterDialogComponent>,
    private filterService: FilterService
  ) { }

  ngOnInit() {
    this.mageEvent = this.filterService.getEvent()
    this.teams = this.mageEvent?.teams

    const observationFilter = this.filterService.getObservationFilter()
    this.initialMemberFilter = observationFilter?.memberFilter ?? null
    this.memberFilter = this.initialMemberFilter
    this.hasAttachments.set(observationFilter?.hasAttachments ?? false)
    this.isFlaggedImportant.set(observationFilter?.isFlaggedImportant ?? false)
    this.isUserFavorite.set(observationFilter?.isUserFavorite ?? false)
    this.condition.set(observationFilter?.fieldFilter?.condition)

    const savedInterval = observationFilter?.timeInterval
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

  onConditionChanged(condition: Condition | undefined): void {
    this.condition.set(condition)
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
    if (this.fieldFilter()?.hasIncompleteCondition) {
      this.showIncompleteConditionError.set(true)
      return
    }

    this.filterService.setObservationFilter({
      memberFilter: this.memberFilter,
      hasAttachments: this.hasAttachments(),
      isUserFavorite: this.isUserFavorite(),
      isFlaggedImportant: this.isFlaggedImportant(),
      timeInterval: this.timeInterval(),
    }, this.condition())
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
