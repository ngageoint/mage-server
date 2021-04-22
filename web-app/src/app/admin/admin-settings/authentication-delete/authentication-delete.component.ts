import { Component, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Strategy } from '../admin-settings.model';


@Component({
  selector: 'authentication-delete',
  templateUrl: './authentication-delete.component.html',
  styleUrls: ['./authentication-delete.component.scss']
})
export class AuthenticationDeleteComponent {

  constructor(
    public dialogRef: MatDialogRef<AuthenticationDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public strategy: Strategy) {

  }

  close(): void {
    this.dialogRef.close('cancel');
  }

  delete(): void {
    this.dialogRef.close('delete');
  }

}