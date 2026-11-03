import { CommonModule } from '@angular/common'
import { Component, inject, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { MatListModule } from '@angular/material/list'
import { forkJoin } from 'rxjs';
import { UserAvatarModule } from '../../user/user-avatar/user-avatar.module';
import { UserService } from '../../user/user.service';

interface Data {
  userIds: string[]
}

@Component({
    selector: 'observation-favorites',
    templateUrl: './observation-favorites.component.html',
    styleUrls: ['./observation-favorites.component.scss'],
    imports: [CommonModule, MatButtonModule, MatDialogModule, MatListModule, UserAvatarModule]
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
