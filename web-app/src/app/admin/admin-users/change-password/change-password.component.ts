import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { A11yModule } from '@angular/cdk/a11y';

import { confirmPasswordValidator, evaluatePasswordStrength } from '../../../password/password';
import { PasswordStrength } from 'src/app/entities/password/password';
import { UserService } from '../../../user/user.service';
import { User } from '../user';

@Component({
    selector: 'mage-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.scss'],
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        MatProgressBarModule,
        A11yModule
    ]
})
export class ChangePasswordComponent {
  private readonly dialogRef = inject(MatDialogRef<ChangePasswordComponent>);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly user: User = inject<{ user: User }>(MAT_DIALOG_DATA).user;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly passwordStrength = signal<PasswordStrength | undefined>(undefined);

  form = new FormGroup({
    password: new FormControl('', [Validators.required]),
    passwordconfirm: new FormControl('', [Validators.required])
  });

  constructor() {
    const passwordControl = this.form.controls.password;
    const confirmControl = this.form.controls.passwordconfirm;

    confirmControl.addValidators(confirmPasswordValidator(() => passwordControl.value || ''));

    passwordControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.passwordStrength.set(evaluatePasswordStrength(value || '', this.user?.username));
      confirmControl.updateValueAndValidity();
    });
  }

  updatePassword(): void {
    if (this.form.invalid || !this.user?.id) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const authentication = {
      password: this.form.controls.password.value,
      passwordconfirm: this.form.controls.passwordconfirm.value
    };

    this.userService.updateUserPassword(this.user.id, authentication)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.snackBar.open('Password successfully updated.', 'Close', { duration: 5000 });
          this.dialogRef.close();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(
            (typeof err?.error === 'string' ? err.error : err?.error?.message) ||
            'Failed to update password'
          );
        }
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
