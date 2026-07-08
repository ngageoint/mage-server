import { Component } from '@angular/core';
import { MatDialogRef as MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'password-reset-dialog',
    templateUrl: './password-reset-success-dialog.html',
    styleUrls: ['./password-reset-success-dialog.scss'],
    standalone: false
})
export class PasswordResetSuccessDialog {

  constructor(
    public dialogRef: MatDialogRef<PasswordResetSuccessDialog>,
  ) {}

}