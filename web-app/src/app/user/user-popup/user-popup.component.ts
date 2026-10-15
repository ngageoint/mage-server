import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { SidebarService } from '../../sidebar/sidebar.service';
import moment from 'moment';
import { MapService } from '../../map/map.service';

@Component({
    selector: 'user-popup',
    templateUrl: './user-popup.component.html',
    styleUrls: ['./user-popup.component.scss'],
    standalone: false
})
export class UserPopupComponent implements OnInit, OnChanges {
  @Input() userWithLocation: any;

  user: any
  location: any
  date: string
  followingUser: any

  constructor(
    private sidebarService: SidebarService,
    private mapService: MapService) { }

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
    this.sidebarService.viewUser(this.userWithLocation)
  }

  onZoom(): void {
    this.mapService.zoomToFeatureInLayer(this.user, 'People');
  }

  onFollow(): void {
    this.mapService.followFeatureInLayer(this.user, 'People');
  }
}
