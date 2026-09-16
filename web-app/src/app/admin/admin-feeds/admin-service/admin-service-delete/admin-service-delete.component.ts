import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA as MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Service, Feed } from '@ngageoint/mage.web-core-lib/feed';

type ServiceWithFeeds = {
  service: Service
  feeds: Feed[]
}

@Component({
    selector: 'app-admin-service-delete',
    templateUrl: './admin-service-delete.component.html',
    styleUrls: ['./admin-service-delete.component.scss'],
    standalone: true,
    imports: [
      MatDialogModule,
      MatButtonModule,
      MatIconModule
    ]
})
export class AdminServiceDeleteComponent {

  service: Service
  feeds: Feed[]

  constructor( @Inject(MAT_DIALOG_DATA) public data: ServiceWithFeeds) {
    this.service = data.service
    this.feeds = data.feeds
  }

}
