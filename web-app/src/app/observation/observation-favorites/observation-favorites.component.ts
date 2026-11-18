import { Component, inject, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { MatListModule } from '@angular/material/list'
import { forkJoin } from 'rxjs';
import { UserAvatarComponent } from '../../user/user-avatar/user-avatar.component';
import { UserService } from '../../user/user.service';

interface Data {
  userIds: string[]
}

@Component({
    selector: 'observation-favorites',
    templateUrl: './observation-favorites.component.html',
    styleUrls: ['./observation-favorites.component.scss'],
    imports: [MatButtonModule, MatDialogModule, MatListModule, UserAvatarComponent]
})
export class ObservationFavoritesComponent {
  public readonly dialogRef: MatDialogRef<ObservationFavoritesComponent> = inject(MatDialogRef)
  public readonly data: Data = inject(MAT_DIALOG_DATA)
  private readonly userService: UserService = inject(UserService)

  users = signal<any[]>([])

  constructor() {
    forkJoin(this.data.userIds.map((userId: string) => this.userService.getUser(userId))).subscribe((result: any[]) => {
      this.users.set(result)
    })
  }

  close(): void {
    this.dialogRef.close()
  }

}
