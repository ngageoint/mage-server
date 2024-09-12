import { Component, Inject } from '@angular/core'
import { MAT_DIALOG_DATA } from '@angular/material/dialog'
import { Feed } from '@ngageoint/mage.web-core-lib/feed'

@Component({
  selector: 'app-admin-feed-delete',
  templateUrl: './admin-feed-delete.component.html',
  styleUrls: ['./admin-feed-delete.component.scss']
})
export class AdminFeedDeleteComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public feed: Feed) {}

}
