import _ from 'underscore';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith, debounceTime, switchMap } from 'rxjs/operators';
import {
  ServiceType,
  FeedTopic,
  Service,
  FeedExpanded,
  FeedService
} from 'core-lib-src/feed';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent as MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import {
  trigger,
  state,
  transition,
  style,
  animate
} from '@angular/animations';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminFeedDeleteComponent } from './admin-feed-delete/admin-feed-delete.component';
import { AdminEventsService } from '../../services/admin-events.service';
import { AdminUserService } from '../../services/admin-user.service';
import { EventService } from '../../../../app/services/event.service';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';

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
  ]
})
export class AdminFeedComponent implements OnInit {
  @ViewChild('eventSelect', { static: false }) eventSelect!: ElementRef;
  @ViewChild('eventAutocompleteTrigger', { static: false })
  eventAutocompleteTrigger!: MatAutocompleteTrigger;

  breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Feeds',
      icon: 'rss_feed',
      route: ['/feeds']
    }
  ];

  feedsRoute: any[] = ['../../feeds'];
  feedEditRoute: any[] | null = null;

  feedId: string | null = null;

  feedLoaded!: Promise<boolean>;
  feed!: FeedExpanded;
  fullFeed = '';
  hasFeedCreatePermission = false;
  hasFeedEditPermission = false;
  hasFeedDeletePermission = false;
  hasUpdateEventPermission = false;

  eventsPerPage = 10;
  eventsPage = 0;
  totalFeedEvents = 0;
  editEvent = false;
  addEvent = false;
  selectedEvent = '';

  searchControl: UntypedFormControl = new UntypedFormControl();
  eventModel: any;
  filteredChoices!: Observable<any[]>;
  events: any[] = [];
  nonFeedEvents: Array<any> = [];
  feedEvents: any[] = [];
  loadingEvents = false;

  service!: Service;
  feedServiceType!: ServiceType;
  feedTopic!: FeedTopic;

  private myself: any | null = null;
  private allFeedEvents: any[] = [];

  constructor(
    private feedService: FeedService,
    private route: ActivatedRoute,
    private router: Router,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private eventsService: AdminEventsService,
    private adminUserService: AdminUserService,
    private eventService: EventService
  ) {}

  ngOnInit(): void {
    this.feedId = this.route.snapshot.paramMap.get('feedId');

    this.adminUserService.getMyself().subscribe({
      next: (myself) => {
        this.myself = myself;

        const perms: string[] = myself?.role?.permissions || [];
        this.hasFeedCreatePermission = perms.includes('FEEDS_CREATE_FEED');
        this.hasFeedEditPermission = perms.includes('FEEDS_CREATE_FEED');
        this.hasFeedDeletePermission = perms.includes('FEEDS_CREATE_FEED');
        this.hasUpdateEventPermission = perms.includes('UPDATE_EVENT');

        this.initFeed();
      },
      error: () => {
        this.myself = null;
        this.hasFeedCreatePermission = false;
        this.hasFeedEditPermission = false;
        this.hasFeedDeletePermission = false;
        this.hasUpdateEventPermission = false;

        this.initFeed();
      }
    });
  }

  private initFeed(): void {
    if (!this.feedId) return;

    this.feedService.fetchFeed(this.feedId).subscribe((feed) => {
      this.feed = feed;

      this.breadcrumbs = [
        {
          title: 'Feeds',
          icon: 'rss_feed',
          route: ['/feeds']
        },
        {
          title: this.feed.title
        }
      ];

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

      this.filteredChoices = this.searchControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        switchMap((value) => {
          const searchTerm =
            !value || typeof value === 'string' ? value : value.name;
          return this.loadAvailableEvents(searchTerm || '');
        })
      );
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

  loadAvailableEvents(searchTerm: string): Observable<any[]> {
    return this.eventsService
      .getEvents({
        term: searchTerm,
        excludeFeedId: this.feed.id,
        page: 0,
        page_size: 1000
      })
      .pipe(
        map((response) => {
          let events = response.items || [];

          events = events.filter(
            (event) => !this.eventHasFeed(event, this.feed.id)
          );

          if (!this.hasUpdateEventPermission) {
            const myId = this.myself?.id;

            events = events.filter((event) => {
              const permissions = myId
                ? event.acl?.[myId]?.permissions || []
                : [];
              return permissions.includes('update');
            });
          }

          return events.slice(0, 20);
        })
      );
  }

  toggleNewEvent(): void {
    this.addEvent = !this.addEvent;

    if (this.addEvent) {
      setTimeout(() => {
        const el = this.eventSelect?.nativeElement;
        if (el) el.focus();
      });
    }
  }

  addFeedToEvent($event: MatAutocompleteSelectedEvent): void {
    const eventId = String($event.option.id);

    this.eventService.addFeed(eventId, `"${this.feed.id}"`).subscribe({
      next: (event: any) => {
        this.searchControl.reset();
        this.eventModel = null;
        this.addEvent = false;

        this.loadAllEvents();

        this.snackBar.open(
          `Feed added to event ${event?.name || ''}`,
          undefined,
          {
            duration: 5 * 1000
          }
        );
      },
      error: () => {
        this.snackBar.open(`Failed to add feed to event`, undefined, {
          duration: 5 * 1000
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
          this.searchControl.reset();
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

  tagEventsAutocompleteOverlayPane(): void {
    window.setTimeout(() => {
      const autocompleteId = this.eventAutocompleteTrigger?.autocomplete?.id;

      if (!autocompleteId) return;

      const panel = document.getElementById(autocompleteId);

      if (!panel) return;

      const overlayPane = panel.closest(
        '.cdk-overlay-pane'
      ) as HTMLElement | null;

      if (!overlayPane) return;

      overlayPane.classList.add('events-add-autocomplete-overlay-pane');
    });
  }
}
