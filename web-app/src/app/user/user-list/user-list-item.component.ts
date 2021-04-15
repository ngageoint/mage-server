import { Component, EventEmitter, Inject, Input, Output, ViewChild } from '@angular/core';
import { MatRipple } from '@angular/material/core';
import { FeedPanelService } from 'src/app/feed-panel/feed-panel.service';
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

  @ViewChild(MatRipple) ripple: MatRipple

  token: string
  followingUser: any

  constructor(
    private feedPanelService: FeedPanelService,
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
    this.feedPanelService.viewUser(this.user)
  }

  onRipple(): void {
    this.ripple.launch({
      centered: true
    })
  }

}
