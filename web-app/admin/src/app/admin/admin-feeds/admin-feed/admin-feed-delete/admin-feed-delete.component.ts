import { CommonModule } from '@angular/common'
import { Component, Inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MAT_DIALOG_DATA as MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { Feed } from '@ngageoint/mage.web-core-lib/feed'

@Component({
  selector: 'app-admin-feed-delete',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],

  templateUrl: './admin-feed-delete.component.html',
  styleUrls: ['./admin-feed-delete.component.scss']
})
export class AdminFeedDeleteComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public feed: Feed) {}

}
