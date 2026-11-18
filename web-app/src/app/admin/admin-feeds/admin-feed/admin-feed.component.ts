import { Component, DestroyRef, OnInit, OnDestroy, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, map } from 'rxjs';
import {
  Service,
  FeedExpanded,
  FeedService
} from 'core-lib-src/feed';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FeedIconModule } from '@ngageoint/mage.web-core-lib/feed/feed-icon';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { AdminFeedDeleteComponent } from './admin-feed-delete/admin-feed-delete.component';
import { AdminEventsService } from '../../services/admin-events.service';
import { EventService } from '../../../event/event.service';
import { MageEvent } from 'mage-web-app/entities/event/entities.event';
import {
  SearchModalComponent,
  SearchModalData,
  SearchModalResult,
  SearchModalColumn
} from '../../search-modal/search-modal.component';
import { SessionService } from 'mage-web-app/http/session.service';
import { RouteReuse } from '../../../route-reuse.strategy';

@Component({
    selector: 'app-admin-feed',
    templateUrl: './admin-feed.component.html',
    styleUrls: ['./admin-feed.component.scss'],
    imports: [
        RouterModule,
        MatCardModule,
        MatDividerModule,
        MatIconModule,
        MatButtonModule,
        MatListModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        FeedIconModule
    ]
})
export class AdminFeedComponent implements OnInit, OnDestroy {
  static readonly routeReuse: RouteReuse = RouteReuse.RecreateOnParamChange;

  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly feedService: FeedService = inject(FeedService);
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly eventsService: AdminEventsService = inject(AdminEventsService);
  private readonly eventService: EventService = inject(EventService);
  private readonly sessionService: SessionService = inject(SessionService);
  private readonly breadcrumbService: AdminBreadcrumbService = inject(AdminBreadcrumbService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Feeds',
    icon: 'rss_feed',
    route: ['/admin/feeds']
  }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  readonly feedId: string = this.route.snapshot.paramMap.get('feedId');

  readonly feed = signal<FeedExpanded | null>(null);
  readonly service = computed(() => this.feed()?.service as Service | undefined);

  get hasFeedEditPermission(): boolean {
    return this.sessionService.hasPermission('FEEDS_CREATE_FEED');
  }

  get hasFeedDeletePermission(): boolean {
    return this.sessionService.hasPermission('FEEDS_CREATE_FEED');
  }

  get hasUpdateEventPermission(): boolean {
    return this.sessionService.hasPermission('UPDATE_EVENT');
  }

  eventsPerPage = 10;
  readonly eventsPage = signal(0);
  readonly totalFeedEvents = signal(0);
  readonly feedEvents = signal<any[]>([]);
  readonly loadingEvents = signal(false);

  private allFeedEvents: any[] = [];

  private get myself(): any | null {
    return this.sessionService.user;
  }

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.initFeed();
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  private initFeed(): void {
    this.feedService.fetchFeed(this.feedId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((feed) => {
      this.feed.set(feed);

      this.breadcrumbs = [{
        title: 'Feeds',
        icon: 'rss_feed',
        route: ['/admin/feeds']
      },{
        title: feed.title
      }];
      this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);

      this.loadAllEvents();
    });
  }

  loadAllEvents(): void {
    this.loadingEvents.set(true);

    this.eventsService
      .getEvents({
        feedId: this.feedId,
        page: 0,
        page_size: 1000
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const events = response.items || [];

          this.allFeedEvents = events.filter((event) =>
            this.eventHasFeed(event, this.feedId)
          );

          this.totalFeedEvents.set(this.allFeedEvents.length);
          this.clampEventsPage();
          this.applyEventsPage();

          this.loadingEvents.set(false);
        },
        error: (err) => {
          console.error('Error loading feed events:', err);
          this.loadingEvents.set(false);
        }
      });
  }

  addEventToFeed(): void {
    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Feed to Event',
        searchPlaceholder: 'Search for events...',
        type: 'events',
        icon: 'event',
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          const searchOptions: any = {
            page,
            page_size: pageSize
          };

          if (searchTerm) {
            searchOptions.term = searchTerm;
          }

          return this.eventsService.getEvents(searchOptions).pipe(
            map((response) => {
              let events = (response.items || []).filter(
                (event) => !this.eventHasFeed(event, this.feedId)
              );

              if (!this.hasUpdateEventPermission) {
                const myId = this.myself?.id;
                events = events.filter((event) => {
                  const permissions = myId ? event.acl?.[myId]?.permissions || [] : [];
                  return permissions.includes('update');
                });
              }

              return {
                items: events,
                totalCount: response.totalCount || events.length,
                pageSize,
                pageIndex: page
              };
            })
          );
        },
        columns: [
          {
            key: 'name',
            label: 'Event Name',
            displayFunction: (event: MageEvent) => event.name || 'Unnamed Event',
            width: '50%'
          },
          {
            key: 'description',
            label: 'Description',
            displayFunction: (event: MageEvent) => event.description || '',
            width: '50%'
          }
        ] as SearchModalColumn[]
      } as SearchModalData
    });

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result?.selectedItem) {
        const selectedEvent = result.selectedItem;

        this.eventService.addFeed(String(selectedEvent.id), this.feedId).subscribe({
          next: (event: any) => {
            this.loadAllEvents();
            this.snackBar.open(
              `Feed added to event ${event?.name || selectedEvent.name || ''}`,
              undefined,
              { duration: 5 * 1000 }
            );
          },
          error: () => {
            this.snackBar.open(`Failed to add feed to event`, undefined, {
              duration: 5 * 1000
            });
          }
        });
      }
    });
  }

  removeFeedFromEvent($event: MouseEvent, event: any): void {
    $event.stopPropagation();

    this.eventService
      .removeFeed(String(event.id), this.feedId)
      .subscribe({
        next: () => {
          this.loadAllEvents();

          this.snackBar.open(
            `Feed removed from event ${event?.name || ''}`,
            undefined,
            {
              duration: 5 * 1000
            }
          );
        },
        error: () => {
          this.snackBar.open(`Failed to remove feed from event`, undefined, {
            duration: 5 * 1000
          });
        }
      });
  }

  onEventsPageChange(event: any): void {
    this.eventsPage.set(event.pageIndex);
    this.eventsPerPage = event.pageSize;
    this.applyEventsPage();
  }

  deleteFeed(): void {
    const feed = this.feed();
    if (!feed) return;

    this.dialog
      .open(AdminFeedDeleteComponent, {
        data: feed,
        disableClose: true
      })
      .afterClosed()
      .subscribe((result) => {
        if (result === true) {
          this.feedService.deleteFeed(feed).subscribe(() => {
            this.router.navigate(['../../feeds'], { relativeTo: this.route });
          });
        }
      });
  }

  private applyEventsPage(): void {
    const start = this.eventsPage() * this.eventsPerPage;
    const end = start + this.eventsPerPage;

    this.feedEvents.set(this.allFeedEvents.slice(start, end));
  }

  private clampEventsPage(): void {
    const maxPageIndex = this.maxEventsPageIndex();

    if (this.eventsPage() > maxPageIndex) {
      this.eventsPage.set(maxPageIndex);
    }
  }

  private maxEventsPageIndex(): number {
    if (!this.totalFeedEvents()) return 0;

    return Math.ceil(this.totalFeedEvents() / this.eventsPerPage) - 1;
  }

  private eventHasFeed(event: any, feedId: string): boolean {
    if (!event || !feedId) return false;

    const candidates = [
      event.feedId,
      event.feed?.id,
      event.feed?._id,
      event.feed,
      event.feeds,
      event.feedIds,
      event.feedIdsForEvent
    ];

    for (const candidate of candidates) {
      if (this.candidateHasId(candidate, feedId)) {
        return true;
      }
    }

    return false;
  }

  private candidateHasId(candidate: any, id: string): boolean {
    if (!candidate) return false;

    if (typeof candidate === 'string') {
      return candidate === id;
    }

    if (Array.isArray(candidate)) {
      return candidate.some((item) => this.candidateHasId(item, id));
    }

    if (typeof candidate === 'object') {
      return (
        candidate.id === id || candidate._id === id || candidate.feedId === id
      );
    }

    return false;
  }
}
