import { AfterViewInit, Component, Inject } from '@angular/core'
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog'
import { Strategy } from '../../admin-authentication/admin-settings.model'
import { AuthenticationConfigurationService } from '../../services/admin-authentication-configuration.service'

@Component({
  selector: 'admin-authentication-delete',
  templateUrl: './admin-authentication-delete.component.html',
  styleUrls: ['./admin-authentication-delete.component.scss']
})
export class AuthenticationDeleteComponent implements AfterViewInit {
  userCount = 0

  constructor(
    public dialogRef: MatDialogRef<AuthenticationDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public strategy: Strategy,
    private authenticationConfigurationService: AuthenticationConfigurationService
  ) {}

  ngAfterViewInit(): void {
    this.authenticationConfigurationService.countUsers(this.strategy._id).subscribe({
      next: (result: any) => {
        this.userCount = result?.data?.count ?? result?.count ?? 0
      },
      error: (err: any) => {
        console.error(err)
      }
    })
  }

  close(): void {
    this.dialogRef.close('cancel')
  }

  delete(): void {
    this.authenticationConfigurationService.deleteConfiguration(this.strategy).subscribe({
      next: () => {
        this.dialogRef.close('delete')
      },
      error: (err: any) => {
        console.error(err)
        this.dialogRef.close('error')
      }
    })
  }
}
