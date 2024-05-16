import { AfterViewInit, Component, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Strategy } from '../../admin-authentication/admin-settings.model';
import { AdminAuthenticationService } from '../admin-authentication.service';

@Component({
  selector: 'admin-authentication-delete',
  templateUrl: './admin-authentication-delete.component.html',
  styleUrls: ['./admin-authentication-delete.component.scss']
})
export class AuthenticationDeleteComponent implements AfterViewInit {
  userCount = 0;

  constructor(
    public dialogRef: MatDialogRef<AuthenticationDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public strategy: Strategy,
    private authenticationConfigurationService: AdminAuthenticationService) {
  }

  ngAfterViewInit(): void {
    this.authenticationConfigurationService.countUsers(this.strategy._id).subscribe({
      next: (result) => {
        this.userCount = result.data.count;
      },
      error: (err: any) => {
        console.error(err);
      }
    })
  }

  close(): void {
    this.dialogRef.close('cancel');
  }

  delete(): void {
    this.authenticationConfigurationService.deleteConfiguration(this.strategy).subscribe({
      next: (result) => {
        this.dialogRef.close('delete');
      },
      error: (err: any) => {
        console.error(err);
        this.dialogRef.close('error');
      }
    })
  }
}