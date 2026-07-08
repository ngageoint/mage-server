import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { confirmPasswordValidator, evaluatePasswordStrength } from '../../../password/password';
import { PasswordStrength, passwordStrengthScores } from 'src/app/entities/password/password';
import { UserService } from '../../../user/user.service';
import { User } from '../user';

@Component({
    selector: 'mage-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.scss'],
    standalone: false
})
export class ChangePasswordComponent {
  user: User;
  saving = false;
  error: string | null = null;

  passwordStrength: PasswordStrength = passwordStrengthScores[0];

  form = new FormGroup({
    password: new FormControl('', [Validators.required]),
    passwordconfirm: new FormControl('', [Validators.required])
  });

  constructor(
    public dialogRef: MatDialogRef<ChangePasswordComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: User },
    private userService: UserService,
    private snackBar: MatSnackBar
  ) {
    this.user = data.user;

    const passwordControl = this.form.controls.password;
    const confirmControl = this.form.controls.passwordconfirm;

    confirmControl.addValidators(confirmPasswordValidator(() => passwordControl.value || ''));

    passwordControl.valueChanges.subscribe((value) => {
      this.passwordStrength = evaluatePasswordStrength(value || '', this.user?.username);
      confirmControl.updateValueAndValidity();
    });
  }

  updatePassword(): void {
    if (this.form.invalid || !this.user?.id) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = null;

    const authentication = {
      password: this.form.controls.password.value,
      passwordconfirm: this.form.controls.passwordconfirm.value
    };

    this.userService.updateUserPassword(this.user.id, authentication).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Password successfully updated.', 'Close', { duration: 5000 });
        this.dialogRef.close();
      },
      error: (err) => {
        this.saving = false;
        this.error =
          (typeof err?.error === 'string' ? err.error : err?.error?.message) ||
          'Failed to update password';
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
