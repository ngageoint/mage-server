import { Component, OnInit, OnDestroy, HostListener, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { PageEvent as PageEvent } from '@angular/material/paginator';
import { PageOf } from '@ngageoint/mage.web-core-lib/paging'

import {
  SearchOptions,
  AdminEventsService
} from '../../services/admin-events.service';

import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { Event } from 'mage-web-app/filter/filter.types';
import { CreateEventDialogComponent } from '../create-event/create-event.component';
import { AdminToastService } from '../../services/admin-toast.service';
import { SessionService } from 'mage-web-app/http/session.service';

@Component({
    selector: 'admin-events',
    templateUrl: './event-dashboard.component.html',
    styleUrls: ['./event-dashboard.component.scss'],
    standalone: false
})
export class EventDashboardComponent implements OnInit, OnDestroy {
  events: PageOf<Event> | null = null;
  filteredEvents: Event[] = [];

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

  get hasEventCreatePermission(): boolean {
    return this.sessionService.hasPermission('CREATE_EVENT');
  }

  eventStatusFilter: 'all' | 'active' | 'complete' = 'all';

  breadcrumbs: AdminBreadcrumb[] = [{ title: 'Events', icon: 'event' }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  constructor(
    private modal: MatDialog,
    private eventService: AdminEventsService,
    private sessionService: SessionService,
    private toastService: AdminToastService,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.refreshEvents();
    this.updateResponsiveLayout();
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
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
      width: '600px',
      data: { team: {} }
    });

    dialogRef.afterClosed().subscribe((newEvent: Event | undefined) => {
      if (newEvent?.id) {
        this.toastService.show(
          'Event Created',
          ['/admin/events', newEvent.id],
          'Go to Event'
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
