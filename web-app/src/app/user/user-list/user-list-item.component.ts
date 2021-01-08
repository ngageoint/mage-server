import { Component, EventEmitter, Inject, Input, Output, ViewChild } from '@angular/core';
import { MatRipple } from '@angular/material';
import { FeedService } from 'src/app/feed/feed.service';
import { LocalStorageService, MapService } from 'src/app/upgrade/ajs-upgraded-providers';

@Component({
  selector: 'user-list-item',
  templateUrl: './user-list-item.component.html',
  styleUrls: ['./user-list-item.component.scss']
})
export class UserListItemComponent {
  @Input() user: any
  @Input() follow: any
  @Input() followable: boolean

  @Output() click = new EventEmitter<any>()

  @ViewChild(MatRipple, { static: false }) ripple: MatRipple

  token: string
  followingUser: any

  constructor(
    private feedService: FeedService,
    @Inject(MapService) private mapService: any,
    @Inject(LocalStorageService) localStorageService: any) {
    this.followingUser = mapService.followedFeature
    this.token = localStorageService.getToken()
  }

  followUser(event): void {
    event.stopPropagation();
    this.mapService.followFeatureInLayer(this.user, 'People')
  }

  onUserLocation(): void {
    this.mapService.zoomToFeatureInLayer(this.user, 'People')
  }

  viewUser(): void {
    this.onUserLocation()
    this.feedService.viewUser(this.user)
  }

  onRipple(): void {
    this.ripple.launch({
      centered: true
    })
  }

}
