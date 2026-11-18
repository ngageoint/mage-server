import { Component, Inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MAT_DIALOG_DATA as MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { A11yModule } from '@angular/cdk/a11y'
import { Feed } from '@ngageoint/mage.web-core-lib/feed'

@Component({
    selector: 'app-admin-feed-delete',
    templateUrl: './admin-feed-delete.component.html',
    styleUrls: ['./admin-feed-delete.component.scss'],
    standalone: true,
    imports: [
      MatDialogModule,
      MatButtonModule,
      MatIconModule,
      A11yModule
    ]
})
export class AdminFeedDeleteComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public feed: Feed) {}

}
