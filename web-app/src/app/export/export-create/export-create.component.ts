import { animate, style, transition, trigger } from '@angular/animations';
import { Component, OnInit, Inject, EventEmitter, Output } from '@angular/core';
import { ExportService } from '../export.service';
import moment from 'moment';
import { FilterService } from 'src/app/filter/filter.service';
import { FilterChoice, INTERVAL_CHOICES } from 'src/app/filter/filter.types';
import { Event as FilterEvent } from 'src/app/entities/event/entities.event';
import { Export, ExportFormat, ExportFormProjection, ExportRequest, FormProjection } from '../entities.export';
import { ObservationFieldFilter } from '../../entities/observation/filter/entities.observation.filter'
import { MemberFilterSelection } from '../../event/event-member-filter.component';
import { EMPTY, map, Observable, startWith, Subject, switchMap } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';
import { AbstractControl, FormControl, ValidationErrors } from '@angular/forms';
import { EventService } from 'src/app/event/event.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { ObservationService, ObservationsPageRequestOptions } from 'src/app/observation/observation.service';
import { SessionService } from 'src/app/http/session.service';
import { LocationService } from 'src/app/user/location/location.service';
import { Form } from '../../entities/event/entities.event';

type ExportFormatOption = {
  text: string
  value: ExportFormat
}

const filterDefinitions = {
  members: { icon: 'group', tooltip: 'Members' },
  attachments: { icon: 'attach_file', tooltip: 'Has attachments' },
  favorites: { icon: 'favorite', tooltip: 'Favorites' },
  important: { icon: 'flag', tooltip: 'Important' },
  fieldFilters: { icon: 'tune', tooltip: 'Field filters' }
}

@Component({
  selector: 'export-create',
  templateUrl: 'export-create.component.html',
  styleUrls: ['./export-create.component.scss'],
  standalone: false,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('250ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class ExportCreateComponent implements OnInit {
  @Output() close = new EventEmitter<Export | null>()

  events: FilterEvent[] = []
  exportEvent: FilterEvent | null = null
  eventControl = new FormControl<FilterEvent | null>(null, (control: AbstractControl): ValidationErrors | null => {
    return control.value?.id ? null : { required: true }
  })

  filteredEvents?: Observable<FilterEvent[]>

  exportObservations = true
  exportLocations = true
  showTypeRequiredError = false

  isFavorite = false;
  isImportant = false;
  hasAttachments = false;
  includeAttachments = true;

  exportFormats: ExportFormatOption[] = [{
    text: 'CSV',
    value: ExportFormat.CSV
  }, {
    text: 'KML',
    value: ExportFormat.KML
  }, {
    text: 'GeoPackage',
    value: ExportFormat.GEOPACKAGE
  }, {
    text: 'GeoJSON',
    value: ExportFormat.GEOJSON
  }]

  exportTimeOptions: FilterChoice[] = INTERVAL_CHOICES

  exportFormat: ExportFormat = this.exportFormats[0].value;
  defaultStartDate: Date
  defaultEndDate: Date

  observationExportTime: string | number = 86400;
  observationStartDate?: Date
  observationEndDate?: Date

  locationExportTime: string | number = 86400;
  locationStartDate?: Date
  locationEndDate?: Date

  formProjections: FormProjection[] = []
  filter: ObservationFieldFilter | null = null
  memberFilter: MemberFilterSelection | null = null
  locationMemberFilter: MemberFilterSelection | null = null

  get activeObservationFilters(): { icon: string, tooltip: string }[] {
    const filters: { icon: string, tooltip: string }[] = []
    if (this.memberFilter && (this.memberFilter.teamIds.length > 0 || this.memberFilter.userIds.length > 0)) {
      filters.push({ icon: filterDefinitions.members.icon, tooltip: this.memberFilterTooltip(this.memberFilter) })
    }
    if (this.hasAttachments) filters.push(filterDefinitions.attachments)
    if (this.isFavorite) filters.push(filterDefinitions.favorites)
    if (this.isImportant) filters.push(filterDefinitions.important)
    if (this.filter && (this.filter.condition != null || this.filter.keyword)) filters.push(filterDefinitions.fieldFilters)
    return filters
  }

  showObservationPreview = false

  preview?: {
    items: any[],
    totalCount: number,
    links: { next: number | null, prev: number | null }
  }

  locationPreview?: { totalCount: number }
  loadingLocationPreview = true

  readonly exportSizeWarningLimit = 10000
  loadingPreview = true
  pageIndex = 0
  pageSize = 10

  private getObservations$ = new Subject<ObservationsPageRequestOptions>()
  private getLocations$ = new Subject<{ startDate?: string, endDate?: string, users?: string[], teams?: string[] }>()

  constructor(
    private eventService: EventService,
    private filterService: FilterService,
    private observationService: ObservationService,
    private locationService: LocationService,
    private sessionService: SessionService,
    @Inject(ExportService) public exportService: ExportService,
  ) {
    this.defaultStartDate = moment().startOf('day').toDate()
    this.defaultEndDate = moment().endOf('day').toDate()
  }

  ngOnInit(): void {
    const timeKey = this.mapCurrentFilterTimeValue()
    this.observationExportTime = timeKey
    this.locationExportTime = timeKey
    if (timeKey === 'custom') {
      this.observationStartDate = this.filterService.interval.options?.startDate ?? this.defaultStartDate
      this.observationEndDate = this.filterService.interval.options?.endDate ?? this.defaultEndDate
      this.locationStartDate = this.filterService.interval.options?.startDate ?? this.defaultStartDate
      this.locationEndDate = this.filterService.interval.options?.endDate ?? this.defaultEndDate
    }

    this.getObservations$.pipe(
      switchMap(options => this.exportEvent ? this.observationService.getObservationsPage(this.exportEvent, options) : EMPTY)
    ).subscribe(result => {
      this.preview = result
      this.loadingPreview = false
    })

    this.getLocations$.pipe(
      switchMap(options => this.exportEvent ? this.locationService.getUserLocationsCount(this.exportEvent, options) : EMPTY)
    ).subscribe(result => {
      this.locationPreview = result
      this.loadingLocationPreview = false
    })

    const event = this.filterService.getEvent()
    this.eventControl.setValue(event)
    this.setEvent(event)

    this.eventService.query().subscribe((events: FilterEvent[]) => {
      this.events = events
      this.filteredEvents = this.eventControl.valueChanges.pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : (value?.name ?? '')),
        map(name => name ? this.filterEvent(name) : this.events.slice())
      )
    })
  }

  toggleExportObservations(): void {
    this.exportObservations = !this.exportObservations
    if (!this.exportObservations) {
      this.includeAttachments = false
    } else {
      this.showTypeRequiredError = false
      this.refreshPreview()
    }
  }

  toggleExportLocations(): void {
    this.exportLocations = !this.exportLocations
    if (this.exportLocations) {
      this.showTypeRequiredError = false
      this.refreshLocationPreview()
    }
  }

  refreshPreview(): void {
    this.pageIndex = 0
    this.getObservations()
  }

  showPreview(): void {
    this.showObservationPreview = true
    this.pageSize = 10
    this.refreshPreview()
  }

  hidePreview(): void {
    this.showObservationPreview = false
    this.refreshPreview()
  }

  onObservationStartDate(date: Date): void {
    this.observationStartDate = date
    this.refreshPreview()
  }

  onObservationEndDate(date: Date): void {
    this.observationEndDate = date
    this.refreshPreview()
  }

  onLocationStartDate(date: Date): void {
    this.locationStartDate = date
    this.refreshLocationPreview()
  }

  onLocationEndDate(date: Date): void {
    this.locationEndDate = date
    this.refreshLocationPreview()
  }

  refreshLocationPreview(): void {
    this.getLocations()
  }

  getLocations(): void {
    if (!this.exportEvent) return

    const options: { startDate?: string, endDate?: string, users?: string[], teams?: string[] } = {}

    const { start: locationStartDate, end: locationEndDate } = this.exportInterval(this.locationExportTime, this.locationStartDate, this.locationEndDate)
    if (locationStartDate) options.startDate = locationStartDate
    if (locationEndDate) options.endDate = locationEndDate

    if (this.locationMemberFilter?.teamIds?.length) options.teams = this.locationMemberFilter.teamIds
    if (this.locationMemberFilter?.userIds?.length) options.users = this.locationMemberFilter.userIds

    this.loadingLocationPreview = true
    this.getLocations$.next(options)
  }

  submit(): void {
    const selectedEvent = this.eventControl.value

    if (this.eventControl.invalid || !selectedEvent) {
      this.eventControl.markAsTouched()
      return
    }

    if (!this.exportObservations && !this.exportLocations) {
      this.showTypeRequiredError = true
      return
    }

    const exportRequest: ExportRequest = {
      format: this.exportFormat
    }

    if (this.exportObservations) {
      const { start, end } = this.exportInterval(this.observationExportTime, this.observationStartDate, this.observationEndDate)
      exportRequest.observations = {
        startDate: start,
        endDate: end,
        includeAttachments: this.includeAttachments
      }
      if (this.memberFilter?.teamIds?.length) exportRequest.observations.teams = this.memberFilter.teamIds
      if (this.memberFilter?.userIds?.length) exportRequest.observations.users = this.memberFilter.userIds
      if (this.isFavorite) exportRequest.observations.favorites = true
      if (this.isImportant) exportRequest.observations.important = true
      if (this.hasAttachments) exportRequest.observations.hasAttachments = true
      if (this.filter?.keyword) exportRequest.observations.keyword = this.filter.keyword
      if (this.filter?.condition) exportRequest.observations.condition = this.filter.condition

      let projection: ExportFormProjection[] | undefined
      const projectAllFields = this.formProjections.every(form => form.selected && form.fieldProjections.every(field => field.selected))
      if (!projectAllFields) {
        projection = this.formProjections
          .filter(formProjection => {
            return formProjection.fieldProjections.some(fieldProjection => fieldProjection.selected)
          })
          .map(formProjection => {
            const fields = formProjection.fieldProjections
              .filter(fieldProjection => fieldProjection.selected)
              .map(fieldProjection => fieldProjection.field.name)

            return {
              formId: formProjection.form.id,
              fields
            }
          })
      }
      if (projection) {
        exportRequest.observations.projection = projection
      }
    }

    if (this.exportLocations) {
      const { start, end } = this.exportInterval(this.locationExportTime, this.locationStartDate, this.locationEndDate)
      exportRequest.locations = {
        startDate: start,
        endDate: end
      }
      if (this.locationMemberFilter?.teamIds?.length) exportRequest.locations.teams = this.locationMemberFilter.teamIds
      if (this.locationMemberFilter?.userIds?.length) exportRequest.locations.users = this.locationMemberFilter.userIds
    }

    this.exportService.export(selectedEvent.id, exportRequest).subscribe((response: Export) => {
      this.close.emit(response)
    });
  }

  cancel(): void {
    this.close.emit()
  }

  onFilterChanged(filter: ObservationFieldFilter): void {
    this.filter = (filter?.condition || filter?.keyword?.length) ? filter : null
    this.refreshPreview()
  }

  onMemberFilterChanged(selection: MemberFilterSelection): void {
    this.memberFilter = (selection.teamIds.length || selection.userIds.length) ? selection : null
    this.refreshPreview()
  }

  onLocationMemberFilterChanged(selection: MemberFilterSelection): void {
    this.locationMemberFilter = (selection.teamIds.length || selection.userIds.length) ? selection : null
    this.refreshLocationPreview()
  }

  onPageChange(event: PageEvent): void {
    const pageSizeChanged = event.pageSize !== this.pageSize
    const forward = event.pageIndex > this.pageIndex

    this.pageSize = event.pageSize
    this.pageIndex = pageSizeChanged ? 0 : event.pageIndex

    const page = pageSizeChanged ? 0 : (forward ? this.preview?.links.next : this.preview?.links.prev) ?? 0
    this.getObservations(page)
  }

  getObservations(page = 0): void {
    if (!this.exportEvent) return

    const options: ObservationsPageRequestOptions = {
      states: 'active',
      sort: 'timestamp+-1',
      populate: true,
      page,
      page_size: this.showObservationPreview ? this.pageSize : 1,
      include_total_count: true
    }

    const { start: observationStartDate, end: observationEndDate } = this.exportInterval(this.observationExportTime, this.observationStartDate, this.observationEndDate)
    if (observationStartDate) options.observationStartDate = observationStartDate
    if (observationEndDate) options.observationEndDate = observationEndDate

    if (this.filter) options.filter = this.filter
    if (this.isFavorite) options.favoritedBy = this.sessionService.user.id
    if (this.isImportant) options.important = true
    if (this.hasAttachments) options.hasAttachments = true
    if (this.memberFilter?.teamIds?.length) options.teams = this.memberFilter.teamIds
    if (this.memberFilter?.userIds?.length) options.users = this.memberFilter.userIds

    this.loadingPreview = true
    this.getObservations$.next(options)
  }

  onEventSelected(event: MatAutocompleteSelectedEvent): void {
    this.setEvent(event.option.value as FilterEvent)
  }

  private setEvent(event: FilterEvent | null) {
    this.exportEvent = event
    this.filter = null
    this.memberFilter = null
    this.locationMemberFilter = null
    this.showObservationPreview = false
    const forms = event?.forms || []
    this.formProjections = forms
      .filter((form: Form) => !form.archived)
      .map((form: Form) => {
        const projections = form.fields
          .filter(field => !field.archived)
          .filter(field => field.type !== 'attachment')
          .sort((a, b) => a.id - b.id)
          .map(field => ({ field, selected: true }))

        return {
          form,
          selected: true,
          selectedCount: projections.length,
          fieldProjections: projections
        }
      })

    this.refreshPreview()
    this.refreshLocationPreview()
  }

  onDisplayEvent(event: FilterEvent | null): string {
    return event?.name ?? '';
  }

  private filterEvent(name: string): FilterEvent[] {
    const filterValue = name.toLowerCase();
    return this.events.filter(option => option.name.toLowerCase().indexOf(filterValue) === 0);
  }

  fieldSelected(formProjection: FormProjection): void {
    formProjection.selectedCount = formProjection.fieldProjections.filter(fieldProjection => fieldProjection.selected).length
  }

  allFieldsSelected(formProjection: FormProjection): boolean {
    if (formProjection.fieldProjections.length === 0) {
      return false
    }

    return formProjection.fieldProjections.every(field => field.selected)
  }

  someFieldsSelected(formProjection: FormProjection): boolean {
    if (formProjection.fieldProjections.length === 0) {
      return false
    }

    const allSelected = this.allFieldsSelected(formProjection)
    const someSelected = formProjection.fieldProjections.some(field => field.selected)
    return !allSelected && someSelected
  }

  noFieldsSelected(formProjection: FormProjection): boolean {
    if (formProjection.fieldProjections.length === 0) {
      return true
    }

    return !formProjection.fieldProjections.some(field => field.selected)
  }

  selectedAllFields(formProjection: FormProjection, selected: boolean) {
    formProjection.fieldProjections.forEach(field => (field.selected = selected))
  }

  trackByObservationId(index: number, observation: any): any {
    return observation.id
  }

  trackByFilterIcon(index: number, filter: { icon: string, tooltip: string }): string {
    return filter.icon
  }

  private memberFilterTooltip(memberFilter: MemberFilterSelection): string {
    const parts: string[] = []
    if (memberFilter.teamIds.length) parts.push(`${memberFilter.teamIds.length} team${memberFilter.teamIds.length === 1 ? '' : 's'}`)
    if (memberFilter.userIds.length) parts.push(`${memberFilter.userIds.length} user${memberFilter.userIds.length === 1 ? '' : 's'}`)
    return `Members: ${parts.join(', ')}`
  }

  private mapCurrentFilterTimeValue(): string | number {
    return this.filterService.interval?.choice?.filter ?? 86400
  }

  private exportInterval(filterValue: string | number, startDate?: Date, endDate?: Date): { start?: string, end?: string } {
    let start: string | undefined
    let end: string | undefined
    if (filterValue === 'all') {
      // no bounds
    } else if (filterValue === 'today') {
      start = moment().startOf('day').toISOString()
      end = moment().endOf('day').toISOString()
    } else if (filterValue === 'custom') {
      start = moment(startDate).toISOString()
      end = moment(endDate).toISOString()
    } else {
      start = moment().subtract(filterValue, 'seconds').toISOString()
    }

    return { start, end }
  }
}
