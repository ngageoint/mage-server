import { Component, OnInit, inject, signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Role } from '../user';
import { ApiService } from '../../../api/api.service';
import { UserService } from '../../../user/user.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';

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

  passwordErrorMessages: string[] = [];
  passwordStrength?: PasswordStrength;
  passwordHelpText?: string;

  signup = new FormGroup({
    displayName: new FormControl('', [Validators.required]),
    username: new FormControl('', [Validators.required]),
    email: new FormControl('', [emailValidator]),
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
      this.passwordHelpText = api.authenticationStrategies?.local?.passwordHelpText;
    });

    const passwordControl = this.signup.get('password');
    const confirmControl = this.signup.get('passwordconfirm');
    const username = this.signup.get('username')?.value;

    passwordControl?.valueChanges.subscribe((value) => {
      this.passwordStrength = evaluatePasswordStrength(value, username);
      this.passwordErrorMessages = [];
      confirmControl?.updateValueAndValidity();
    });

    confirmControl?.setValidators([
      Validators.required,
      confirmPasswordValidator(() => this.signup.get('password')?.value)
    ]);
    confirmControl?.updateValueAndValidity();
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
      error: (response: any) => {
        this.saving.set(false);
        if (response.status === 400) {
          this.passwordErrorMessages = [response.error];
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
    if (errors?.['required']) return ['Password is required'];
    return this.passwordErrorMessages;
  }
}
