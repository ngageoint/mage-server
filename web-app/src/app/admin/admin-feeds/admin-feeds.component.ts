import _ from 'underscore'
import { Component, OnInit } from '@angular/core'
import { Feed, Service, FeedService } from '@ngageoint/mage.web-core-lib/feed'
import { MatDialog as MatDialog } from '@angular/material/dialog'
import { forkJoin } from 'rxjs'
import { AdminFeedDeleteComponent } from './admin-feed/admin-feed-delete/admin-feed-delete.component'
import { AdminServiceDeleteComponent } from './admin-service/admin-service-delete/admin-service-delete.component'
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { SessionService } from 'mage-web-app/http/session.service'

@Component({
    selector: 'admin-feeds',
    templateUrl: './admin-feeds.component.html',
    styleUrls: ['./admin-feeds.component.scss'],
    standalone: false
})
export class AdminFeedsComponent implements OnInit {
  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Feeds',
    icon: 'rss_feed',
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

  constructor(
    private feedService: FeedService,
    public dialog: MatDialog,
    private sessionService: SessionService
  ) {}

  get hasServiceDeletePermission(): boolean {
    return this.sessionService.hasPermission('FEEDS_CREATE_SERVICE')
  }

  get hasFeedCreatePermission(): boolean {
    return this.sessionService.hasPermission('FEEDS_CREATE_FEED')
  }

  get hasFeedEditPermission(): boolean {
    return this.sessionService.hasPermission('FEEDS_CREATE_FEED')
  }

  get hasFeedDeletePermission(): boolean {
    return this.sessionService.hasPermission('FEEDS_CREATE_FEED')
  }

  ngOnInit(): void {
    forkJoin({
      services: this.feedService.fetchServices(),
      feeds: this.feedService.fetchAllFeeds()
    }).subscribe(({ services, feeds }) => {
      this._services = (services ?? []).sort(this.sortByTitle)
      this.services = this._services.slice()
    
      this._feeds = (feeds ?? []).sort(this.sortByTitle)
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

  deleteService($event: MouseEvent, service: Service): void {
    $event.stopPropagation()
  
    this.dialog.open(AdminServiceDeleteComponent, {
      data: { service, feeds: this._feeds.filter(f => f.service === service.id) },
      autoFocus: false,
      disableClose: true
    }).afterClosed().subscribe(result => {
      if (result === true) {
        this.feedService.deleteService(service).subscribe(() => {
          this._services = this._services.filter(s => s.id !== service.id)
          this.services = this.services.filter(s => s.id !== service.id)
  
          this._feeds = this._feeds.filter(f => f.service !== service.id)
  
          this.updateFilteredFeeds()
          this.updateFilteredServices()
        })
      }
    })
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
        })
      }
    })
  }

  private sortByTitle(a: { title: string }, b: { title: string }): number {
    return a.title < b.title ? -1 : 1
  }

  private filterByTitleAndSummary(text: string): (item: { title: string, summary?: string | null }) => boolean {
    return (item: { title: string, summary?: string | null }): boolean => {
      const textLowerCase = text.toLowerCase()
      const title = item.title.toLowerCase()
      const summary = item.summary ? item.summary.toLowerCase() : ''
      return title.indexOf(textLowerCase) !== -1 || summary.indexOf(textLowerCase) !== -1
    }
  }
}
