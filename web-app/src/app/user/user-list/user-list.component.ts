import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import moment from 'moment';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { EventService } from '../../event/event.service';
import { FilterService } from '../../filter/filter.service';
import { LocationFilterDialogComponent } from '../location/location-filter.component';
import { EventLocationFilter } from '../../filter/filter.types';

@Component({
    selector: 'user-list',
    templateUrl: './user-list.component.html',
    styleUrls: ['./user-list.component.scss'],
    standalone: false
})
export class UserListComponent implements OnInit {
  loaded = false
  searchError = false
  stale = false

  currentUserPage = 0
  userPages: any[][] = []
  usersPerPage = 50
  totalUsers = 0
  filterCount = 0
  filterPluralMapping = {
    '=0': 'No active filters',
    '=1': '1 active filter',
    'other': '# active filters'
  }
  userCount: number
  filterTimerange: string
  activeFilterIcons: string[] = []

  private locations: any[] = []

  constructor(
    private dialog: MatDialog,
    private eventService: EventService,
    private filterService: FilterService,
    private destroyRef: DestroyRef) {
  }

  openFilterDialog(): void {
    this.dialog.open(LocationFilterDialogComponent, {
      autoFocus: false,
      restoreFocus: false,
      width: '675px'
    })
  }

  ngOnInit(): void {
    this.filterService.locationFilter$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((filter: EventLocationFilter) => this.onLocationFilter(filter))

    this.eventService.locations$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result === null) return
        this.locations = result.data ?? []
        this.userCount = this.locations.length
        this.loaded = true
        this.calculateUserPages(this.locations)

        const hasError = result.error != null
        this.searchError = hasError && this.locations.length === 0
        this.stale = hasError && this.locations.length > 0
      })
  }

  retryLocations(): void {
    this.eventService.retryLocations()
  }

  trackByPageId(index: number, _page: any): any {
    return index
  }

  trackByUserId(_index: number, user: any): any {
    return user.id
  }

  private onLocationFilter(filter: EventLocationFilter) {
    this.loaded = false
    this.searchError = false
    this.stale = false
    this.locations = []
    this.currentUserPage = 0

    const { memberFilter } = filter ?? {}
    this.filterTimerange = this.formatTimeInterval(filter?.timeInterval)
    this.activeFilterIcons = (memberFilter && (memberFilter.teamIds.length > 0 || memberFilter.userIds.length > 0)) ? ['group'] : []
    this.filterCount = this.activeFilterIcons.length
  }

  onPageChange(event: PageEvent): void {
    this.currentUserPage = event.pageIndex
    if (event.pageSize !== this.usersPerPage) {
      this.usersPerPage = event.pageSize
      this.calculateUserPages(this.locations)
    }
  }

  private formatTimeInterval(timeInterval?: EventLocationFilter['timeInterval']): string {
    if (!timeInterval) return 'All time'
    const { choice } = timeInterval
    if (!choice || choice.label === 'All') return 'All time'
    if (choice.filter === 'custom') {
      const format = (date?: Date) => date ? moment(date).format('MMM D, YYYY') : '?'
      return `${format(timeInterval.options?.startDate)} – ${format(timeInterval.options?.endDate)}`
    }
    return choice.label
  }

  calculateUserPages(users: any[]): void {
    if (!users) return;

    users.sort((a, b) => {
      return moment(b.location.properties.timestamp).valueOf() - moment(a.location.properties.timestamp).valueOf()
    })

    const pages: any[][] = [];
    for (let i = 0, j = users.length; i < j; i += this.usersPerPage) {
      pages.push(users.slice(i, i + this.usersPerPage));
    }

    this.totalUsers = users.length
    this.userPages = pages;

    if (this.currentUserPage === -1 && pages.length) {
      this.currentUserPage = 0;
    }

    this.currentUserPage = Math.min(this.currentUserPage, pages.length - 1);
  }
}
