import { Component, Input } from '@angular/core';
import { SidebarService } from '../../sidebar/sidebar.service';
import { MapService } from '../../map/map.service';
import { UserWithLocation } from '../../entities/user/entities.user-location';

@Component({
    selector: 'user-popup',
    templateUrl: './user-popup.component.html',
    styleUrls: ['./user-popup.component.scss'],
    standalone: false
})
export class UserPopupComponent {
  @Input({ required: true }) userWithLocation: UserWithLocation;

  followingUser: MapService['followedFeature']

  constructor(
    private sidebarService: SidebarService,
    private mapService: MapService) {
    this.followingUser = mapService.followedFeature
  }

  get user(): UserWithLocation['user'] {
    return this.userWithLocation.user
  }

  get location(): UserWithLocation['location'] {
    return this.userWithLocation.location
  }

  onInfo(): void {
    this.sidebarService.viewUser(this.userWithLocation)
  }

  onZoom(): void {
    this.mapService.zoomToFeatureInLayer(this.user, 'people');
  }

  onFollow(): void {
    this.mapService.followFeatureInLayer(this.user, 'people');
  }
}
