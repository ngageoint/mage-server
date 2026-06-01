import { ChangeDetectorRef, Component, Inject } from '@angular/core'
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { UserService } from '../../user/user.service';

interface Data {
  userIds: string[]
}

@Component({
    selector: 'observation-favorites',
    templateUrl: './observation-favorites.component.html',
    styleUrls: ['./observation-favorites.component.scss'],
    standalone: false
})
export class ObservationFavoritesComponent {
  users: any[]

  constructor(
    public dialogRef: MatDialogRef<ObservationFavoritesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Data,
    userService: UserService,
    cdr: ChangeDetectorRef) {

    forkJoin(data.userIds.map((userId: string) => userService.getUser(userId))).subscribe((result: any[]) => {
      this.users = result
    })
  }

  close(): void {
    this.dialogRef.close()
  }

}
