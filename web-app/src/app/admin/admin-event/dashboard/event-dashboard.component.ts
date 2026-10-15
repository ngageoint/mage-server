import { Component, OnInit, OnDestroy, TemplateRef, ViewChild, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageOf } from '@ngageoint/mage.web-core-lib/paging'

import {
  SearchOptions,
  AdminEventsService
} from '../../services/admin-events.service';

import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { MageEvent } from 'mage-web-app/entities/event/entities.event';
import { CreateEventDialogComponent } from '../create-event/create-event.component';
import { AdminToastService } from '../../services/admin-toast.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'admin-events',
    templateUrl: './event-dashboard.component.html',
    styleUrls: ['./event-dashboard.component.scss'],
    imports: [
      MatCardModule,
      MatChipsModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatButtonModule,
      MatListModule,
      MatPaginatorModule,
      FormsModule,
      RouterLink
    ]
})
export class EventDashboardComponent implements OnInit, OnDestroy {
  events: PageOf<MageEvent> | null = null;
  readonly filteredEvents = signal<MageEvent[]>([]);

  eventSearch = '';

  searchOptions: SearchOptions = {
    page: 0,
    page_size: 10,
    state: 'all'
  };

  readonly totalEvents = signal(0);
  pageSizeOptions = [5, 10, 25, 50];

  get hasEventCreatePermission(): boolean {
    return this.sessionService.hasPermission('CREATE_EVENT');
  }

  eventStatusFilter: 'all' | 'active' | 'complete' = 'all';

  breadcrumbs: AdminBreadcrumb[] = [{ title: 'Events', icon: 'event' }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  private readonly refresh$ = new Subject<void>();
  private readonly searchTerm$ = new Subject<string>();

  constructor(
    private modal: MatDialog,
    private eventService: AdminEventsService,
    private sessionService: SessionService,
    private toastService: AdminToastService,
    private breadcrumbService: AdminBreadcrumbService
  ) {
    this.refresh$
      .pipe(
        switchMap(() => this.eventService.getEvents(this.searchOptions).pipe(
          catchError((err) => {
            console.error('Error fetching events:', err);
            return EMPTY;
          })
        )),
        takeUntilDestroyed()
      )
      .subscribe((events) => {
        this.events = events;
        const items = events?.items || [];
        this.filteredEvents.set(items);
        this.totalEvents.set(events?.totalCount ?? items.length);
      });

    this.searchTerm$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.searchOptions = { ...this.searchOptions, term, page: 0 };
        this.refreshEvents();
      });
  }

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.refreshEvents();
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  refreshEvents(): void {
    this.refresh$.next();
  }

  onSearchTermChanged(term: string): void {
    this.eventSearch = term || '';
    this.searchTerm$.next(this.eventSearch);
  }

  onSearchCleared(): void {
    this.eventSearch = '';
    this.searchTerm$.next('');
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

    dialogRef.afterClosed().subscribe((newEvent: MageEvent | undefined) => {
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
}
