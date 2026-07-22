import { Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { MatRipple } from '@angular/material/core';
import { MapService } from '../../map/map.service';
import { SessionService } from '../../http/session.service';
import { SidebarService } from '../../sidebar/sidebar.service';

@Component({
    selector: 'user-list-item',
    templateUrl: './user-list-item.component.html',
    styleUrls: ['./user-list-item.component.scss'],
    standalone: false
})
export class UserListItemComponent implements OnChanges {
  @Input() userWithLocation: any
  @Input() follow: any
  @Input() followable: boolean

  @Output() click = new EventEmitter<any>()

  @ViewChild(MatRipple) ripple: MatRipple

  token: string | undefined
  followingUser: any

  user: any
  location: any

  constructor(
    private sidebarService: SidebarService,
    private mapService: MapService,
    sessionService: SessionService) {
    this.followingUser = mapService.followedFeature
    this.token = sessionService.getToken()
  }

  ngOnChanges(): void {
    if (!this.userWithLocation) return
    this.user = this.userWithLocation.user
    this.location = this.userWithLocation.location
  }

  followUser(event): void {
    event.stopPropagation();
    this.mapService.followFeatureInLayer(this.userWithLocation, 'people')
  }

  onUserLocation(): void {
    this.mapService.zoomToFeatureInLayer(this.userWithLocation, 'people')
  }

  viewUser(): void {
    this.onUserLocation()
    this.sidebarService.viewUser(this.user)
  }

  onRipple(): void {
    this.ripple.launch({
      centered: true
    })
  }

}
