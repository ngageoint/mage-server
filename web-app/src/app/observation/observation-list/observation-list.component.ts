import { Component, DestroyRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nPluralPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import moment from 'moment';
import { EventService } from '../../event/event.service';
import { FilterService } from '../../filter/filter.service';
import { ObservationService } from '../observation.service';
import { SearchBarComponent } from '../../search-bar/search-bar.component';
import { ObservationFilterDialogComponent } from '../observation-filter/observation-filter.component';
import { ObservationListItemComponent } from './observation-list-item.component';
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
    imports: [
      I18nPluralPipe,
      MatButtonModule,
      MatIconModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatToolbarModule,
      MatTooltipModule,
      SearchBarComponent,
      ObservationListItemComponent
    ]
})
export class ObservationListComponent implements OnInit, OnDestroy {
  private readonly dialog: MatDialog = inject(MatDialog)
  private readonly eventService: EventService = inject(EventService)
  private readonly filterService: FilterService = inject(FilterService)
  private readonly observationService: ObservationService = inject(ObservationService)
  private readonly destroyRef: DestroyRef = inject(DestroyRef)

  readonly loaded = signal(false)
  readonly searchError = signal(false)
  readonly stale = signal(false)

  readonly observations = signal<any[]>([])
  readonly currentPageIndex = signal(0)
  pageSize = 50
  readonly totalObservations = signal(0)

  @ViewChild(SearchBarComponent) private searchBar: SearchBarComponent

  readonly event = signal<any>(undefined)

  readonly filterCount = signal(0)
  filterPluralMapping = {
    '=0': 'No active filters',
    '=1': '1 active filter',
    'other': '# active filters'
  }
  readonly activeFilters = signal<{ icon: string; tooltip: string }[]>([])
  readonly observationCount = signal<number | undefined>(undefined)
  readonly filterTimerange = signal('')

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
    this.event.set(event)
    this.currentPageIndex.set(0)
  }

  onObservationPage(page: any) {
    if (page === null) return
    const observations = page.data ?? []
    this.observations.set(observations)
    this.observationCount.set(page.totalCount)
    this.totalObservations.set(page.totalCount ?? 0)
    this.currentPageIndex.set(page.pageIndex ?? 0)
    this.loaded.set(true)

    const hasError = page.error != null
    this.searchError.set(hasError && observations.length === 0)
    this.stale.set(hasError && observations.length > 0)
  }

  retrySearch(): void {
    this.eventService.retrySearch()
  }

  private onObservationFilter(filter: EventObservationFilter) {
    this.loaded.set(false)
    this.searchError.set(false)
    this.stale.set(false)
    this.observations.set([])
    this.currentPageIndex.set(0)
    this.observationService.setPagingOptions({ page: 0, page_size: this.pageSize })
    this.searchBar?.setValue(filter?.fieldFilter?.keyword ?? '')

    const activeFilters = filter ? this.buildActiveFilters(filter) : []
    this.filterTimerange.set(filter ? this.formatTimeInterval(filter.timeInterval) : '')
    this.activeFilters.set(activeFilters)
    this.filterCount.set(activeFilters.length)
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
