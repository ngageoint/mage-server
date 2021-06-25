import { Component, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EventService, UserService } from 'src/app/upgrade/ajs-upgraded-providers'

interface Data {
  userIds: any
  observation: any
}

@Component({
  selector: 'observation-favorites',
  templateUrl: './observation-favorites.component.html',
  styleUrls: ['./observation-favorites.component.scss']
})
export class ObservationFavoritesComponent {
  users: any[]
  observation: any

  constructor(
    public dialogRef: MatDialogRef<ObservationFavoritesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Data,
    @Inject(UserService) userService: any,
    @Inject(EventService) private eventService: any) {

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
