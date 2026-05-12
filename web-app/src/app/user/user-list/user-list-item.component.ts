import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatRipple, MatRippleModule } from '@angular/material/core';
import { MapService } from '../../map/map.service';
import { LocalStorageService } from '../../http/local-storage.service';
import { FeedPanelService } from '../../feed-panel/feed-panel.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { GeometryModule } from 'mage-web-app/geometry/geometry.module';
import { MomentModule } from 'mage-web-app/moment/moment.module';
import { UserAvatarModule } from '../user-avatar/user-avatar.module';

@Component({
  selector: 'user-list-item',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatRippleModule,
    MatIconModule,
    MomentModule,
    GeometryModule,
    UserAvatarModule
  ],
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
