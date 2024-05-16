import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatRipple } from '@angular/material/core';
import { FeedPanelService } from 'src/app/feed-panel/feed-panel.service';
import { LocalStorageService } from '../../http/local-storage.service';
import { MapService } from '../../map/map.service';

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

  token: string | undefined
  followingUser: any

  constructor(
    private feedPanelService: FeedPanelService,
    private mapService: MapService,
    localStorageService: LocalStorageService) {
    this.followingUser = mapService.followedFeature
    this.token = localStorageService.getToken()
  }

  followUser(event): void {
    event.stopPropagation();
    this.mapService.followFeatureInLayer(this.user, 'people')
  }

  onUserLocation(): void {
    this.mapService.zoomToFeatureInLayer(this.user, 'people')
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
