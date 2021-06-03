import { Component, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Strategy } from '../admin-settings.model';
import { AuthenticationConfigurationService } from 'src/app/upgrade/ajs-upgraded-providers';

@Component({
  selector: 'authentication-delete',
  templateUrl: './authentication-delete.component.html',
  styleUrls: ['./authentication-delete.component.scss']
})
export class AuthenticationDeleteComponent {
  constructor(
    public dialogRef: MatDialogRef<AuthenticationDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public strategy: Strategy,
    @Inject(AuthenticationConfigurationService)
    private authenticationConfigurationService: any) {
  }

  close(): void {
    this.dialogRef.close('cancel');
  }

  delete(): void {
    this.authenticationConfigurationService.deleteConfiguration(this.strategy).then(() => {
      this.dialogRef.close('delete');
    }).catch(err => {
      console.error(err);
      this.dialogRef.close('cancel');
    });
  }
}