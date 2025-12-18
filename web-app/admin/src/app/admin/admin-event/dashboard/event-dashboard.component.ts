import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { StateService } from '@uirouter/angular';
import {
  UserService
} from 'admin/src/app/upgrade/ajs-upgraded-providers';
import {
  EventsService,
  SearchOptions,
  EventsResponse
} from '../events.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { Event } from 'src/app/filter/filter.types';
import { CreateEventDialogComponent } from '../create-event/create-event.component';

@Component({
  selector: 'admin-events',
  templateUrl: './event-dashboard.component.html',
  styleUrls: ['./event-dashboard.component.scss']
})
export class EventDashboardComponent implements OnInit {
  events: EventsResponse;
  filteredEvents: Event[] = [];
  displayedColumns: string[] = ['event'];

  numChars = 180;
  toolTipWidth = '1000px';
  eventSearch = '';

  searchOptions: SearchOptions = {
    page: 0,
    page_size: 10,
    state: 'all'
  };

  totalEvents = 0;
  pageSizeOptions = [5, 10, 25, 50];
  hasEventCreatePermission = false;

  eventStatusFilter: 'all' | 'active' | 'complete' = 'all';

  breadcrumbs: AdminBreadcrumb[] = [
    { title: 'Events', iconClass: 'fa fa-calendar' }
  ];

  constructor(
    private modal: MatDialog,
    private stateService: StateService,
    private eventService: EventsService,
    @Inject(UserService) private userService
  ) { }

  ngOnInit(): void {
    this.initPermissions();
    this.refreshEvents();
    this.updateResponsiveLayout();
  }

  /** Initialize permission flags */
  private initPermissions(): void {
    const permissions = this.userService.myself?.role?.permissions || [];
    this.hasEventCreatePermission = permissions.includes('CREATE_USER');
  }

  /** Fetch and apply filters to the event list */
  refreshEvents(): void {
    this.eventService.getEvents(this.searchOptions).subscribe({
      next: (events) => {
        this.events = events;
        this.filteredEvents = events.items;
        this.totalEvents = events.totalCount ?? 0;
      }
      ,
      error: (err) => console.error('Error fetching events:', err)
    });
  }

  /** Handle search term change */
  onSearchTermChanged(term: string): void {
    this.eventSearch = term;
    this.searchOptions = {
      ...this.searchOptions,
      term,
      page: 0
    };
    this.refreshEvents();
  }

  /** Clear search */
  onSearchCleared(): void {
    this.eventSearch = '';
    this.searchOptions = {
      ...this.searchOptions,
      term: '',
      page: 0
    };
    this.refreshEvents();
  }

  /** Reset all filters and pagination */
  reset(): void {
    this.eventSearch = '';
    this.searchOptions = { ...this.searchOptions, page: 0, state: 'all' };
    this.refreshEvents();
  }

  /** Handle pagination change */
  onPageChange(event: PageEvent): void {
    this.searchOptions = {
      ...this.searchOptions,
      page: event.pageIndex,
      page_size: event.pageSize
    };
    this.refreshEvents();
  }

  /** Navigate to event detail */
  gotoEvent(event: Event): void {
    this.stateService.go('admin.event', { eventId: event.id });
  }

  /** Handle status filter change */
  onStatusFilterChange(value: 'all' | 'active' | 'complete'): void {
    this.searchOptions = { ...this.searchOptions, state: value, page: 0 };
    this.refreshEvents();
  }

  /** Open create event dialog */
  createEvent(): void {
    const dialogRef = this.modal.open(CreateEventDialogComponent, {
      data: { team: {} }
    });

    dialogRef.afterClosed().subscribe((newEvent) => {
      if (newEvent) {
        this.stateService.go('admin.event', { eventId: newEvent.id });
      }
    });
  }

  /** Update layout-related values on resize */
  @HostListener('window:resize')
  onResize(): void {
    this.updateResponsiveLayout();
  }

  /** Calculates responsive values */
  private updateResponsiveLayout(): void {
    this.numChars = Math.ceil(window.innerWidth / 8.5);
    this.toolTipWidth = `${window.innerWidth * 0.75}px`;
  }
}
