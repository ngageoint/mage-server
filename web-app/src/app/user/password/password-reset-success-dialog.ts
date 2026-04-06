import { Component } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

@Component({
  selector: 'password-reset-dialog',
  templateUrl: './password-reset-success-dialog.html',
  styleUrls: ['./password-reset-success-dialog.scss']
})
export class PasswordResetSuccessDialog {

  constructor(
    public dialogRef: MatDialogRef<PasswordResetSuccessDialog>,
  ) {}

}