import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { FeedPanelService } from '../../feed-panel/feed-panel.service';
import moment from 'moment';
import { MapService } from '../../map/map.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GeometryModule } from 'mage-web-app/geometry/geometry.module';
import { MomentModule } from 'mage-web-app/moment/moment.module';
import { UserAvatarModule } from '../user-avatar/user-avatar.module';

@Component({
  selector: 'user-popup',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    UserAvatarModule,
    MomentModule,
    GeometryModule
  ],
  templateUrl: './user-popup.component.html',
  styleUrls: ['./user-popup.component.scss']
})
export class UserPopupComponent implements OnInit, OnChanges {
  @Input() userWithLocation: any;

  user: any;
  location: any;
  date: string;
  followingUser: any;

  constructor(
    private feedPanelService: FeedPanelService,
    private mapService: MapService
  ) {}

  ngOnInit(): void {
    this.updateView();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateView();
  }

  private updateView(): void {
    if (!this.userWithLocation) return;

    this.user = this.userWithLocation.user;
    this.location = this.userWithLocation.location;
    this.followingUser = this.mapService.followedFeature;
    this.date = moment(this.location.properties.timestamp).format(
      'YYYY-MM-DD HH:mm:ss'
    );
  }

  onInfo(): void {
    this.feedPanelService.viewUser(this.userWithLocation);
  }

  onZoom(): void {
    this.mapService.zoomToFeatureInLayer(this.user, 'People');
  }

  onFollow(): void {
    this.mapService.followFeatureInLayer(this.user, 'People');
  }
}
