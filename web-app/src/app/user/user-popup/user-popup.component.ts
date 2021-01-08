import { Component, Inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FeedService } from 'src/app/feed/feed.service';
import { MapService } from 'src/app/upgrade/ajs-upgraded-providers';
import * as moment from 'moment';

@Component({
  selector: 'user-popup',
  templateUrl: './user-popup.component.html',
  styleUrls: ['./user-popup.component.scss']
})
export class UserPopupComponent implements OnInit, OnChanges {
  @Input() userWithLocation: any;

  user: any
  location: any
  date: string
  followingUser: any

  constructor(
    private feedService: FeedService,
    @Inject(MapService) private mapService: any) { }

  ngOnInit(): void {
    this.updateView()
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateView()
  }

  private updateView(): void {
    if (!this.userWithLocation) return

    this.user = this.userWithLocation.user
    this.location = this.userWithLocation.location
    this.followingUser = this.mapService.followedFeature
    this.date = moment(this.location.properties.timestamp).format("YYYY-MM-DD HH:mm:ss")
  }

  onInfo(): void {
    this.feedService.viewUser(this.userWithLocation)
  }

  onZoom(): void {
    this.mapService.zoomToFeatureInLayer(this.user, 'People');
  }

  onFollow(): void {
    this.mapService.followFeatureInLayer(this.user, 'People');
  }
}
