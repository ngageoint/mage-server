import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import {
  ServiceType,
  FeedTopic,
  Service,
  FeedExpanded,
  FeedService
} from 'core-lib-src/feed';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import {
  trigger,
  state,
  transition,
  style,
  animate
} from '@angular/animations';
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

@Component({
    selector: 'app-admin-feed',
    templateUrl: './admin-feed.component.html',
    styleUrls: ['./admin-feed.component.scss'],
    animations: [
        trigger('slide', [
            state('1', style({ height: '*', opacity: 1 })),
            state('0', style({ height: '0', opacity: 0 })),
            transition('1 => 0', animate('400ms ease-in-out')),
            transition('0 => 1', animate('400ms ease-in-out'))
        ]),
        trigger('rotate', [
            state('0', style({ transform: 'rotate(0)' })),
            state('1', style({ transform: 'rotate(45deg)' })),
            transition('1 => 0', animate('250ms ease-out')),
            transition('0 => 1', animate('250ms ease-in'))
        ])
    ],
    standalone: false
})
export class AdminFeedComponent implements OnInit, OnDestroy {
  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Feeds',
    icon: 'rss_feed',
    route: ['/admin/feeds']
  }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  feedsRoute: any[] = ['../../feeds'];
  feedEditRoute: any[] | null = null;

  feedId: string | null = null;

  feedLoaded!: Promise<boolean>;
  feed!: FeedExpanded;
  fullFeed = '';

  get hasFeedCreatePermission(): boolean {
    return this.sessionService.hasPermission('FEEDS_CREATE_FEED');
  }

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
  eventsPage = 0;
  totalFeedEvents = 0;
  feedEvents: any[] = [];
  loadingEvents = false;

  service!: Service;
  feedServiceType!: ServiceType;
  feedTopic!: FeedTopic;

  private allFeedEvents: any[] = [];

  private get myself(): any | null {
    return this.sessionService.user;
  }

  constructor(
    private feedService: FeedService,
    private route: ActivatedRoute,
    private router: Router,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private eventsService: AdminEventsService,
    private sessionService: SessionService,
    private eventService: EventService,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.feedId = this.route.snapshot.paramMap.get('feedId');
    this.initFeed();
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  private initFeed(): void {
    if (!this.feedId) return;

    this.feedService.fetchFeed(this.feedId).subscribe((feed) => {
      this.feed = feed;

      this.breadcrumbs = [{
        title: 'Feeds',
        icon: 'rss_feed',
        route: ['/admin/feeds']
      },{
        title: this.feed.title
      }];
      this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);

      this.feedEditRoute = ['../feedEdit', this.feed.id];

      this.fullFeed = JSON.stringify(feed, null, 2);
      this.feedLoaded = Promise.resolve(true);
      this.service = this.feed.service as Service;
      this.feedTopic = this.feed.topic as FeedTopic;

      this.feedService
        .fetchServiceType(this.service.serviceType as string)
        .subscribe((serviceType) => {
          this.feedServiceType = serviceType;
        });

      this.loadAllEvents();
    });
  }

  loadAllEvents(): void {
    if (!this.feed?.id) return;

    this.loadingEvents = true;

    this.eventsService
      .getEvents({
        feedId: this.feed.id,
        page: 0,
        page_size: 1000
      })
      .subscribe({
        next: (response) => {
          const events = response.items || [];

          this.allFeedEvents = events.filter((event) =>
            this.eventHasFeed(event, this.feed.id)
          );

          this.totalFeedEvents = this.allFeedEvents.length;
          this.clampEventsPage();
          this.applyEventsPage();

          this.loadingEvents = false;
        },
        error: (err) => {
          console.error('Error loading feed events:', err);
          this.loadingEvents = false;
        }
      });
  }

  addEventToFeed(): void {
    if (!this.feed?.id) return;

    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Feed to Event',
        searchPlaceholder: 'Search for events...',
        type: 'events',
        icon: 'event',
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return new Observable((observer) => {
            const searchOptions: any = {
              page,
              page_size: pageSize
            };

            if (searchTerm) {
              searchOptions.term = searchTerm;
            }

            this.eventsService.getEvents(searchOptions).subscribe({
              next: (response) => {
                let events = (response.items || []).filter(
                  (event) => !this.eventHasFeed(event, this.feed.id)
                );

                if (!this.hasUpdateEventPermission) {
                  const myId = this.myself?.id;
                  events = events.filter((event) => {
                    const permissions = myId ? event.acl?.[myId]?.permissions || [] : [];
                    return permissions.includes('update');
                  });
                }

                observer.next({
                  items: events,
                  totalCount: response.totalCount || events.length,
                  pageSize,
                  pageIndex: page
                });
                observer.complete();
              },
              error: (error) => observer.error(error)
            });
          });
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

        this.eventService.addFeed(String(selectedEvent.id), this.feed.id).subscribe({
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
      .removeFeed(String(event.id), String(this.feed.id))
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
    this.eventsPage = event.pageIndex;
    this.eventsPerPage = event.pageSize;
    this.applyEventsPage();
  }

  deleteFeed(): void {
    this.dialog
      .open(AdminFeedDeleteComponent, {
        data: this.feed,
        autoFocus: false,
        disableClose: true
      })
      .afterClosed()
      .subscribe((result) => {
        if (result === true) {
          this.feedService.deleteFeed(this.feed).subscribe(() => {
            this.router.navigate(['../../feeds'], { relativeTo: this.route });
          });
        }
      });
  }

  private applyEventsPage(): void {
    const start = this.eventsPage * this.eventsPerPage;
    const end = start + this.eventsPerPage;

    this.feedEvents = this.allFeedEvents.slice(start, end);
  }

  private clampEventsPage(): void {
    const maxPageIndex = this.maxEventsPageIndex();

    if (this.eventsPage > maxPageIndex) {
      this.eventsPage = maxPageIndex;
    }
  }

  private maxEventsPageIndex(): number {
    if (!this.totalFeedEvents) return 0;

    return Math.ceil(this.totalFeedEvents / this.eventsPerPage) - 1;
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
