import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Role } from '../user';
import { ApiService } from '../../../api/api.service';
import { UserService } from '../../../user/user.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  confirmPasswordValidator,
  evaluatePasswordStrength
} from '../../../password/password';
import { emailValidator } from '../../../email/email';

import { PasswordStrength } from 'src/app/entities/password/password';

@Component({
    selector: 'create-user-modal',
    templateUrl: './create-user.component.html',
    styleUrls: ['./create-user.component.scss'],
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        MatSelectModule,
        MatProgressBarModule
    ]
})
export class CreateUserModalComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<CreateUserModalComponent>);
  private readonly apiService = inject(ApiService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly roles: Role[] = inject<{ roles: Role[] }>(MAT_DIALOG_DATA)?.roles ?? [];

  readonly saving = signal(false);
  readonly serverError = signal('');

  showPassword = false;
  showConfirmPassword = false;

  readonly passwordErrorMessages = signal<string[]>([]);
  readonly passwordStrength = signal<PasswordStrength | undefined>(undefined);
  readonly passwordHelpText = signal<string | undefined>(undefined);

  signup = new FormGroup({
    displayName: new FormControl('', [Validators.required]),
    username: new FormControl('', [Validators.required]),
    email: new FormControl('', [emailValidator]),
    phone: new FormControl(''),
    selectedRole: new FormControl(null, [Validators.required]),
    password: new FormControl('', [Validators.required]),
    passwordconfirm: new FormControl('', [Validators.required])
  });

  ngOnInit(): void {
    this.apiService.getApi()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((api: any) => {
        this.passwordHelpText.set(api.authenticationStrategies?.local?.passwordHelpText);
      });

    const passwordControl = this.signup.get('password');
    const confirmControl = this.signup.get('passwordconfirm');
    const username = this.signup.get('username')?.value;

    passwordControl?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.passwordStrength.set(evaluatePasswordStrength(value, username));
        this.passwordErrorMessages.set([]);
        passwordControl.updateValueAndValidity({ emitEvent: false });
        confirmControl?.updateValueAndValidity();
      });

    confirmControl?.setValidators([
      Validators.required,
      confirmPasswordValidator(() => this.signup.get('password')?.value)
    ]);
    confirmControl?.updateValueAndValidity();
  }

  saveUser(): void {
    if (this.signup.invalid || this.passwordErrorMessages().length > 0) {
      this.signup.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.serverError.set('');

    const user = {
      username: this.signup.get('username')?.value,
      displayName: this.signup.get('displayName')?.value,
      email: this.signup.get('email')?.value,
      password: this.signup.get('password')?.value,
      passwordconfirm: this.signup.get('passwordconfirm')?.value,
      roleId: this.signup.get('selectedRole')?.value,
      avatar: null,
      icon: null,
      iconMetadata: null
    };

    this.userService.createUser(user)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (createdUser) => {
          this.dialogRef.close(createdUser);
        },
        error: (response: any) => {
          this.saving.set(false);
          if (response.status === 409) {
            this.signup.get('username')?.setErrors({ exists: true });
          } else if (response.status === 400) {
            this.passwordErrorMessages.set([response.error]);
            this.signup.get('password')?.setErrors({ policy: true });
          } else {
            this.serverError.set('Failed to create user. Please try again.');
          }
        }
      });
  }

  cancelModal(): void {
    this.dialogRef.close();
  }

  getPasswordErrorMessages(errors: any): string[] {
    return errors?.['required'] ? ['Password is required'] : [];
  }
}
