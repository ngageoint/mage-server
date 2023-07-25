import _ from 'underscore'
import { Component, OnInit, Inject, ElementRef, ViewChild } from '@angular/core'
import { FormControl } from '@angular/forms'
import { Observable } from 'rxjs'
import { map, startWith } from 'rxjs/operators'
import { StateService } from '@uirouter/angular'
import { UserService, Event } from '../../../upgrade/ajs-upgraded-providers'
import { ServiceType, FeedTopic, Service, FeedExpanded, FeedService } from '@ngageoint/mage.web-core-lib/feed'
import { MatDialog } from '@angular/material/dialog'
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete'
import { MatSnackBar } from '@angular/material/snack-bar'
import { trigger, state, transition, style, animate } from '@angular/animations'
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model'
import { AdminFeedDeleteComponent } from './admin-feed-delete/admin-feed-delete.component'

@Component({
  selector: 'app-admin-feed',
  templateUrl: './admin-feed.component.html',
  styleUrls: ['./admin-feed.component.scss'],
  animations: [
    trigger('slide', [
      state('1', style({ height: '*', opacity: 1, })),
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
  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Feeds',
    icon: 'rss_feed',
    state: {
      name: 'admin.feeds'
    }
  }]

  feedLoaded: Promise<boolean>
  feed: FeedExpanded
  fullFeed: string
  hasFeedCreatePermission: boolean
  hasFeedEditPermission: boolean
  hasFeedDeletePermission: boolean
  hasUpdateEventPermission: boolean

  eventsPerPage = 10
  eventsPage = 0
  editEvent = false
  addEvent = false
  selectedEvent: string

  searchControl: FormControl = new FormControl()
  eventModel: any
  filteredChoices: Observable<any[]>
  events = []
  nonFeedEvents: Array<Event> = []
  feedEvents = [] as any[]

  service: Service
  feedServiceType: ServiceType
  feedTopic: FeedTopic

  @ViewChild("eventSelect", { static: false }) eventSelect: ElementRef

  constructor(
    private feedService: FeedService,
    private stateService: StateService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    @Inject(UserService) private userService: { myself: { id: string, role: {permissions: Array<string>}}},
    @Inject(Event) private eventResource: any
    ) {
      this.hasFeedCreatePermission = _.contains(userService.myself.role.permissions, 'FEEDS_CREATE_FEED')
      this.hasFeedEditPermission = _.contains(userService.myself.role.permissions, 'FEEDS_CREATE_FEED')
      this.hasFeedDeletePermission = _.contains(userService.myself.role.permissions, 'FEEDS_CREATE_FEED')
      this.hasUpdateEventPermission = _.contains(userService.myself.role.permissions, 'UPDATE_EVENT')
    }

  ngOnInit(): void {
    if (this.stateService.params.feedId) {
      this.feedService.fetchFeed(this.stateService.params.feedId).subscribe(feed => {
        this.feed = feed

        this.breadcrumbs.push({
          title: this.feed.title
        })

        this.fullFeed = JSON.stringify(feed, null, 2)
        this.feedLoaded = Promise.resolve(true)
        this.service = this.feed.service as Service
        this.feedTopic = this.feed.topic as FeedTopic
        this.feedService.fetchServiceType(this.service.serviceType as string).subscribe(serviceType => {
          this.feedServiceType = serviceType
        });
      });
  }

    this.eventResource.query(events => {
      this.events = events.sort((a: {name: string}, b: {name: string}) => {
        if (a.name < b.name) { return -1; }
        if (a.name > b.name) { return 1; }
        return 0;
      });

      this.feedEvents = _.filter(events, event => {
        return _.some(event.feedIds, feedId => {
          return this.feed.id === feedId;
        });
      });

      let chain = _.chain(events);
      if (!this.hasUpdateEventPermission) {
        // filter teams based on acl
        chain = chain.filter(event => {
          const permissions = event.acl[this.userService.myself.id]
            ? event.acl[this.userService.myself.id].permissions
            : [];
          return _.contains(permissions, 'update');
        });
      }

      this.nonFeedEvents = chain.reject(event => {
        return _.some(event.feedIds, (feedId: string) => {
          return this.feed.id === feedId
        });
      })
      .value()
      .sort((a: any, b:any) => a.name < b.name ? -1 : 1)

      this.filteredChoices = this.searchControl.valueChanges.pipe(
        startWith(''),
        map(value => {
          return !value || typeof value === 'string' ? value : value.title
        }),
        map(title => {
          return title ? this.filter(title) : this.nonFeedEvents.slice()
        })
      );
    });
  }

  private filter(title: string): Event[] {
    const filterValue = title.toLowerCase()
    return this.nonFeedEvents.filter((event: any) => event.name.toLowerCase().indexOf(filterValue) === 0)
  }

  toggleNewEvent(): void {
    this.addEvent = !this.addEvent

    if (this.addEvent) {
      setTimeout(() => {
        this.eventSelect.nativeElement.focus()
      })
    }
  }

  addFeedToEvent($event: MatAutocompleteSelectedEvent): void {
    this.eventResource.addFeed({ id: $event.option.id }, `"${this.feed.id}"`, event => {
      this.feedEvents.push(event);
      this.nonFeedEvents = _.reject(this.nonFeedEvents, e => {
        return e.id === event.id
      })
      this.searchControl.reset()

      this.eventModel = null
      this.addEvent = false

      this.snackBar.open(`Feed added to event ${event.name}`, undefined, {
        duration: 5 * 1000,
      });
    });
  }

  removeFeedFromEvent($event: MouseEvent, event: any): void {
    $event.stopPropagation();

    this.eventResource.removeFeed({ id: event.id, feedId: this.feed.id }, removed => {
      this.feedEvents = _.reject(this.feedEvents, e => {
        return e.id === event.id
      });
      this.nonFeedEvents.push(event)
      this.nonFeedEvents = this.nonFeedEvents.sort((a: any, b: any) => a.name < b.name ? -1 : 1)
      this.searchControl.reset()

      this.snackBar.open(`Feed removed from event ${event.name}`, undefined, {
        duration: 5 * 1000,
      });
    });
  }

  editFeed(): void {
    this.stateService.go('admin.feedEdit', { feedId: this.feed.id })
  }

  deleteFeed(): void {
    this.dialog.open(AdminFeedDeleteComponent, {
      data: this.feed,
      autoFocus: false,
      disableClose: true
    }).afterClosed().subscribe(result => {
      if (result === true) {
        this.feedService.deleteFeed(this.feed).subscribe(() => {
          this.goToFeeds()
        })
      }
    });
  }

  goToFeeds(): void {
    this.stateService.go('admin.feeds')
  }

  goToEvent(event: any): void {
    this.stateService.go('admin.event', { eventId: event.id })
  }

}
