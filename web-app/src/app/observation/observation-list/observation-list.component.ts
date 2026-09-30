import { Component, DestroyRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import moment from 'moment';
import { EventService } from '../../event/event.service';
import { FilterService } from '../../filter/filter.service';
import { ObservationService } from '../observation.service';
import { SearchBarComponent } from '../../search-bar/search-bar.component';
import { ObservationFilterDialogComponent } from '../observation-filter/observation-filter.component';
import { EventObservationFilter } from '../../filter/filter.types';

const filterDefinitions = {
  members: { icon: 'group', tooltip: 'Members' },
  attachments: { icon: 'attach_file', tooltip: 'Has attachments' },
  favorites: { icon: 'favorite', tooltip: 'Favorites' },
  important: { icon: 'flag', tooltip: 'Important' },
  fieldFilters: { icon: 'tune', tooltip: 'Field filters' }
}

@Component({
    selector: 'observation-list',
    templateUrl: './observation-list.component.html',
    styleUrls: ['./observation-list.component.scss'],
    standalone: false
})
export class ObservationListComponent implements OnInit, OnDestroy {
  loaded = false
  searchError = false
  stale = false

  observations: any[] = []
  currentPageIndex = 0
  pageSize = 50
  totalObservations = 0

  @ViewChild(SearchBarComponent) private searchBar: SearchBarComponent

  event: any

  filterCount = 0
  filterPluralMapping = {
    '=0': 'No active filters',
    '=1': '1 active filter',
    'other': '# active filters'
  }
  activeFilters: { icon: string; tooltip: string }[] = []
  observationCount: number
  filterTimerange: string

  constructor(
    private dialog: MatDialog,
    private eventService: EventService,
    private filterService: FilterService,
    private observationService: ObservationService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.filterService.event$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.onEvent(event))

    this.filterService.observationFilter$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((filter) => this.onObservationFilter(filter))

    this.eventService.observationPage$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => this.onObservationPage(page))
  }

  ngOnDestroy(): void {
    this.observationService.clearPagingOptions()
  }

  trackByObservationId(_index: number, observation: any): any {
    return observation.id
  }

  onSearch(text: string): void {
    const keyword = text?.trim()
    this.filterService.setObservationKeyword(keyword || undefined)
  }

  openFilterDialog(): void {
    this.dialog.open(ObservationFilterDialogComponent, {
      autoFocus: false,
      restoreFocus: false,
      width: '675px'
    })
  }

  onEvent(event: any) {
    this.event = event
    this.currentPageIndex = 0
  }

  onObservationPage(page: any) {
    if (page === null) return
    this.observations = page.data ?? []
    this.observationCount = page.totalCount
    this.totalObservations = page.totalCount ?? 0
    this.currentPageIndex = page.pageIndex ?? 0
    this.loaded = true

    const hasError = page.error != null
    this.searchError = hasError && this.observations.length === 0
    this.stale = hasError && this.observations.length > 0
  }

  retrySearch(): void {
    this.eventService.retrySearch()
  }

  private onObservationFilter(filter: EventObservationFilter) {
    this.loaded = false
    this.searchError = false
    this.stale = false
    this.observations = []
    this.currentPageIndex = 0
    this.observationService.setPagingOptions({ page: 0, page_size: this.pageSize })
    this.searchBar?.setValue(filter?.fieldFilter?.keyword ?? '')

    this.filterTimerange = filter ? this.formatTimeInterval(filter.timeInterval) : ''
    this.activeFilters = filter ? this.buildActiveFilters(filter) : []
    this.filterCount = this.activeFilters.length
  }

  private formatTimeInterval(timeInterval?: EventObservationFilter['timeInterval']): string {
    const choice = timeInterval?.choice
    if (!choice || choice.label === 'All') return 'All time'

    if (choice.filter === 'custom') {
      const format = (date?: Date) => date ? moment(date).format('MMM D, YYYY') : '?'
      return `${format(timeInterval.options?.startDate)} – ${format(timeInterval.options?.endDate)}`
    }
    return choice.label
  }

  private buildActiveFilters(filter: EventObservationFilter): { icon: string; tooltip: string }[] {
    const { memberFilter, hasAttachments, isUserFavorite, isFlaggedImportant, fieldFilter } = filter
    const filters: { icon: string; tooltip: string }[] = []
    if (memberFilter && (memberFilter.teamIds.length > 0 || memberFilter.userIds.length > 0)) filters.push(filterDefinitions.members)
    if (hasAttachments) filters.push(filterDefinitions.attachments)
    if (isUserFavorite) filters.push(filterDefinitions.favorites)
    if (isFlaggedImportant) filters.push(filterDefinitions.important)
    if (fieldFilter && (fieldFilter.condition != null || fieldFilter.keyword)) filters.push(filterDefinitions.fieldFilters)
    return filters
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize
    this.observationService.setPagingOptions({ page: event.pageIndex, page_size: event.pageSize })
  }
}
