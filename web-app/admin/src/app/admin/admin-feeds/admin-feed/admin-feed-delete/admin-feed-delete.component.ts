import { Component, Inject } from '@angular/core'
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog'
import { Feed } from '@ngageoint/mage.web-core-lib/feed'

@Component({
  selector: 'app-admin-feed-delete',
  templateUrl: './admin-feed-delete.component.html',
  styleUrls: ['./admin-feed-delete.component.scss']
})
export class AdminFeedDeleteComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public feed: Feed) {}

}
