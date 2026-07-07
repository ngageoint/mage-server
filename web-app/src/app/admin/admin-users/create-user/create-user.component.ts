import { Component, OnInit, inject, signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Role } from '../user';
import { ApiService } from '../../../api/api.service';
import { UserService } from '../../../user/user.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import {
  createPasswordPolicyValidator,
  confirmPasswordValidator,
  evaluatePasswordStrength,
  getPasswordTooltip
} from '../../../password/password';

import {
  PasswordStrength,
  passwordStrengthScores
} from 'src/app/entities/password/password';

import { PasswordPolicy } from 'src/app/ingress/authentication/@types/signup';

@Component({
    selector: 'create-user-modal',
    templateUrl: './create-user.component.html',
    styleUrls: ['./create-user.component.scss'],
    standalone: false
})
export class CreateUserModalComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<CreateUserModalComponent>);
  private readonly apiService = inject(ApiService);
  private readonly userService = inject(UserService);
  private readonly data: { roles: Role[] } = inject(MAT_DIALOG_DATA);

  roles: Role[] = [];
  saving = signal(false);
  serverError = signal('');

  showPassword = false;
  showConfirmPassword = false;

  passwordPolicy: PasswordPolicy;
  passwordErrorMessages: string[] = [];
  passwordStrength: PasswordStrength = passwordStrengthScores[0];

  signup = new FormGroup({
    displayName: new FormControl('', [Validators.required]),
    username: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.email]),
    phone: new FormControl(''),
    selectedRole: new FormControl(null, [Validators.required]),
    password: new FormControl('', [Validators.required]),
    passwordconfirm: new FormControl('', [Validators.required])
  });

  constructor() {
    this.roles = this.data?.roles ?? [];
  }

  ngOnInit(): void {
    this.apiService.getApi().subscribe((api: any) => {
      this.passwordPolicy =
        api.authenticationStrategies.local.settings.passwordPolicy;

      const passwordControl = this.signup.get('password');
      const confirmControl = this.signup.get('passwordconfirm');
      const username = this.signup.get('username')?.value;

      if (passwordControl) {
        passwordControl.setValidators([
          Validators.required,
          createPasswordPolicyValidator(
            this.passwordPolicy,
            (errors) => { this.passwordErrorMessages = errors; },
            username
          )
        ]);
        passwordControl.updateValueAndValidity();

        passwordControl.valueChanges.subscribe((value) => {
          this.passwordStrength = evaluatePasswordStrength(value, username);
          confirmControl?.updateValueAndValidity();
        });
      }

      if (confirmControl) {
        confirmControl.setValidators([
          Validators.required,
          confirmPasswordValidator(() => this.signup.get('password')?.value)
        ]);
        confirmControl.updateValueAndValidity();
      }
    });
  }

  saveUser(): void {
    if (this.signup.invalid || this.passwordErrorMessages.length > 0) {
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

    this.userService.createUser(user).subscribe({
      next: (createdUser) => {
        this.dialogRef.close(createdUser);
      },
      error: () => {
        this.saving.set(false);
        this.serverError.set('Failed to create user. Please try again.');
      }
    });
  }

  cancelModal(): void {
    this.dialogRef.close();
  }

  get passwordTooltipText(): string {
    return this.passwordPolicy ? getPasswordTooltip(this.passwordPolicy) : '';
  }

  getPasswordErrorMessages(errors: any): string[] {
    if (errors?.['required']) return ['Password is required'];
    return this.passwordErrorMessages;
  }
}
