import { Component, Inject } from '@angular/core'
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserService } from '../../user/user.service';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { UserAvatarModule } from 'mage-web-app/user/user-avatar/user-avatar.module';

interface Data {
  userIds: any
  observation: any
}

@Component({
  selector: 'observation-favorites',
  standalone: true,
  imports: [
    CommonModule,
    MatDividerModule,
    MatListModule,
    UserAvatarModule
  ],
  templateUrl: './observation-favorites.component.html',
  styleUrls: ['./observation-favorites.component.scss']
})
export class ObservationFavoritesComponent {
  users: any[]
  observation: any

  constructor(
    public dialogRef: MatDialogRef<ObservationFavoritesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Data,
    userService: UserService) {

    this.observation = data.observation
    
    const promises = data.userIds.map(userId => userService.getUser(userId))
    Promise.all(promises).then(result => {
      this.users = result
    })
  }

  close(): void {
    this.dialogRef.close()
  }

}
