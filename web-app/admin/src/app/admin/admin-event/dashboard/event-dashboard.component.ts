import { Component, OnInit, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';

import { AdminUserService } from '../../services/admin-user.service';
import {
  SearchOptions,
  EventsResponse,
  AdminEventsService
} from '../../services/admin-events.service';

import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { Event } from '../../../../../../src/app/filter/filter.types';
import { CreateEventDialogComponent } from '../create-event/create-event.component';
import { AdminToastService } from '../../services/admin-toast.service';

@Component({
  selector: 'admin-events',
  templateUrl: './event-dashboard.component.html',
  styleUrls: ['./event-dashboard.component.scss']
})
export class EventDashboardComponent implements OnInit {
  events: EventsResponse | null = null;
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
    private eventService: AdminEventsService,
    private adminUserService: AdminUserService,
    private router: Router,
    private toastService: AdminToastService
  ) {}

  ngOnInit(): void {
    this.initPermissions();
    this.refreshEvents();
    this.updateResponsiveLayout();
  }

  private initPermissions(): void {
    this.adminUserService.getMyself().subscribe({
      next: (myself) => {
        const permissions: string[] = myself?.role?.permissions || [];
        this.hasEventCreatePermission = permissions.includes('CREATE_EVENT');
      },
      error: () => {
        this.hasEventCreatePermission = false;
      }
    });
  }

  refreshEvents(): void {
    this.eventService.getEvents(this.searchOptions).subscribe({
      next: (events) => {
        this.events = events;
        this.filteredEvents = events?.items || [];
        this.totalEvents = events?.totalCount ?? this.filteredEvents.length;
      },
      error: (err) => console.error('Error fetching events:', err)
    });
  }

  onSearchTermChanged(term: string): void {
    this.eventSearch = term || '';
    this.searchOptions = {
      ...this.searchOptions,
      term: this.eventSearch,
      page: 0
    };
    this.refreshEvents();
  }

  onSearchCleared(): void {
    this.eventSearch = '';
    this.searchOptions = {
      ...this.searchOptions,
      term: '',
      page: 0
    };
    this.refreshEvents();
  }

  reset(): void {
    this.eventSearch = '';
    this.eventStatusFilter = 'all';
    this.searchOptions = {
      ...this.searchOptions,
      page: 0,
      state: 'all',
      term: ''
    };
    this.refreshEvents();
  }

  onPageChange(event: PageEvent): void {
    this.searchOptions = {
      ...this.searchOptions,
      page: event.pageIndex,
      page_size: event.pageSize
    };
    this.refreshEvents();
  }

  onStatusFilterChange(value: 'all' | 'active' | 'complete'): void {
    this.eventStatusFilter = value;
    this.searchOptions = { ...this.searchOptions, state: value, page: 0 };
    this.refreshEvents();
  }

  createEvent(): void {
    const dialogRef = this.modal.open(CreateEventDialogComponent, {
      width: "600px",
      data: { team: {} }
    });

    dialogRef.afterClosed().subscribe((newEvent: Event | undefined) => {
      if (newEvent?.id) {
        this.toastService.show(
          'Event Created',
          ['../events', newEvent.id],
          'Go To Event'
        );
        this.refreshEvents();
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateResponsiveLayout();
  }

  private updateResponsiveLayout(): void {
    this.numChars = Math.ceil(window.innerWidth / 8.5);
    this.toolTipWidth = `${window.innerWidth * 0.75}px`;
  }

  trackByEventId(_: number, event: Event): any {
    return (event as any)?.id ?? event;
  }
}
