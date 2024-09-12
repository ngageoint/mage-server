import _ from 'underscore'
import { Component, OnInit, Inject } from '@angular/core'
import { UserService } from '../../upgrade/ajs-upgraded-providers'
import { Feed, Service, FeedService } from '@ngageoint/mage.web-core-lib/feed'
import { StateService } from '@uirouter/angular'
import { MatDialog } from '@angular/material/dialog'
import { forkJoin } from 'rxjs'
import { AdminFeedDeleteComponent } from './admin-feed/admin-feed-delete/admin-feed-delete.component'
import { AdminServiceDeleteComponent } from './admin-service/admin-service-delete/admin-service-delete.component'
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'

@Component({
  selector: 'admin-feeds',
  templateUrl: './admin-feeds.component.html',
  styleUrls: ['./admin-feeds.component.scss']
})
export class AdminFeedsComponent implements OnInit {
  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Feeds',
    icon: 'rss_feed'
  }]

  services: Service[] = []
  private _services: Service[] = []

  private _feeds: Feed[] = []
  feeds: Feed[] = []

  feedSearch = ''
  serviceSearch = ''

  feedPage = 0
  servicePage = 0
  itemsPerPage = 10

  hasServiceDeletePermission: boolean
  hasFeedCreatePermission: boolean
  hasFeedEditPermission: boolean
  hasFeedDeletePermission: boolean

  constructor(
    private feedService: FeedService,
    private stateService: StateService,
    public dialog: MatDialog,
    @Inject(UserService) userService: { myself: { role: {permissions: Array<string>}}}
  ) {
    this.hasServiceDeletePermission = _.contains(userService.myself.role.permissions, 'FEEDS_CREATE_SERVICE')
    this.hasFeedCreatePermission = _.contains(userService.myself.role.permissions, 'FEEDS_CREATE_FEED')
    this.hasFeedEditPermission = _.contains(userService.myself.role.permissions, 'FEEDS_CREATE_FEED')
    this.hasFeedDeletePermission = _.contains(userService.myself.role.permissions, 'FEEDS_CREATE_FEED')
  }

  ngOnInit(): void {
    forkJoin([
      this.feedService.fetchServices(),
      this.feedService.fetchAllFeeds()
    ]).subscribe(result => {
      this._services = result[0].sort(this.sortByTitle)
      this.services = this._services.slice()

      this._feeds = result[1].sort(this.sortByTitle)
      this.feeds = this._feeds.slice()
    })
  }

  onFeedSearchChange(): void {
    this.feedPage = 0
    this.updateFilteredFeeds()
  }

  onServiceSearchChange(): void {
    this.servicePage = 0
    this.updateFilteredServices()
  }

  clearFeedSearch(): void {
    this.feedPage = 0
    this.feedSearch = ''
    this.feeds = this._feeds.slice()
  }

  clearServiceSearch(): void {
    this.servicePage = 0
    this.serviceSearch = ''
    this.services = this._services.slice()
  }

  updateFilteredFeeds(): void {
    this.feeds = this._feeds.filter(this.filterByTitleAndSummary(this.feedSearch))
  }

  updateFilteredServices(): void {
    this.services = this._services.filter(this.filterByTitleAndSummary(this.serviceSearch))
  }

  goToService(service: Service): void {
    this.stateService.go('admin.service', { serviceId: service.id })
  }

  goToFeed(feed: Feed): void {
    this.stateService.go('admin.feed', { feedId: feed.id })
  }

  newFeed(): void {
    this.stateService.go('admin.feedCreate')
  }

  editFeed(feed: Feed): void {
    // TODO edit feed, and edit service
  }

  deleteService($event: MouseEvent, service: Service): void {
    $event.stopPropagation()

    this.dialog.open(AdminServiceDeleteComponent, {
      data: service,
      autoFocus: false,
      disableClose: true
    }).afterClosed().subscribe(result => {
      if (result === true) {
        this.feedService.deleteService(service).subscribe(() => {
          this.services = this.services.filter(s => s.id !== service.id)
          this._feeds = this._feeds.filter(feed => feed.service === service.id)
          this.updateFilteredFeeds()
          this.updateFilteredServices()
        });
      }
    });
  }

  deleteFeed($event: MouseEvent, feed: Feed): void {
    $event.stopPropagation()

    this.dialog.open(AdminFeedDeleteComponent, {
      data: feed,
      autoFocus: false,
      disableClose: true
    }).afterClosed().subscribe(result => {
      if (result === true) {
        this.feedService.deleteFeed(feed).subscribe(() => {
          this._feeds = this._feeds.filter(f => f.id !== feed.id)
          this.updateFilteredFeeds()
        });
      }
    });
  }

  private sortByTitle(a: {title: string}, b: {title: string}): number {
    return a.title < b.title ? -1 : 1
  }

  private filterByTitleAndSummary(text: string): (item: {title: string, summary?: string | null}) => boolean {
    return (item: { title: string, summary?: string | null }): boolean => {
      const textLowerCase = text.toLowerCase()
      const title = item.title.toLowerCase()
      const summary = item.summary ? item.summary.toLowerCase() : ''
      return title.indexOf(textLowerCase) !== -1 || summary.indexOf(textLowerCase) !== -1
    }
  }

}
