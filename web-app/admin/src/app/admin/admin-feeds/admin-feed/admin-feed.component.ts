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
import { MatDialog } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Feeds',
      icon: 'rss_feed',
      route: ['../../feeds']
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

  @ViewChild('eventSelect', { static: false }) eventSelect!: ElementRef;

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
          route: ['../../feeds']
        },
        {
          title: this.feed.title,
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
    this.loadingEvents = true;

    this.eventsService
      .getEvents({
        feedId: this.feed.id,
        page: this.eventsPage,
        page_size: this.eventsPerPage
      })
      .subscribe({
        next: (response) => {
          this.feedEvents = response.items || [];
          this.totalFeedEvents = response.totalCount || 0;
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
        page_size: 20
      })
      .pipe(
        map((response) => {
          let events = response.items || [];

          if (!this.hasUpdateEventPermission) {
            const myId = this.myself?.id;
            events = events.filter((event) => {
              const permissions = myId
                ? event.acl?.[myId]?.permissions || []
                : [];
              return permissions.includes('update');
            });
          }

          return events;
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
    this.loadAllEvents();
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
}
