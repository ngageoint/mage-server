import { Component, EventEmitter, Output, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  ValidationErrors
} from '@angular/forms';
import { NgStyle } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiService } from '../../../api/api.service';
import { UserService } from '../../../user/user.service';
import { zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

import { PasswordPolicy, SignupEvent } from '../@types/signup';
import { PasswordStrength } from '../../../entities/password/password';

import {
  createPasswordPolicyValidator,
  confirmPasswordValidator,
  evaluatePasswordStrength,
  getPasswordTooltip
} from 'mage-web-app/password/password';
import { emailValidator } from 'mage-web-app/email/email';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
    selector: 'signup',
    templateUrl: './signup.component.html',
    styleUrls: ['./signup.component.scss'],
    standalone: true,
    imports: [
        ReactiveFormsModule,
        NgStyle,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatProgressBarModule
    ]
})
export class SignupComponent {
  @Output() complete = new EventEmitter<SignupEvent>();

  passwordPolicy = signal<PasswordPolicy | undefined>(undefined);
  showPassword = false;
  showConfirmPassword = false;
  passwordErrorMessages = signal<string[]>([]);

  signup = new FormGroup({
    username: new FormControl<string>('', [Validators.required]),
    displayName: new FormControl<string>('', [Validators.required]),
    email: new FormControl<string>('', [emailValidator]),
    phone: new FormControl<string>(''),
    password: new FormControl<string>('', [Validators.required]),
    passwordconfirm: new FormControl<string>('', [Validators.required]),
    captchaText: new FormControl<string>('', [Validators.required])
  });

  passwordStrength = signal<PasswordStrength | undefined>(undefined);
  loadingCaptcha = signal(false);
  captcha = signal<{ uri?: string; token?: string }>({});

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    zxcvbnOptions.setOptions({
      dictionary: {
        ...zxcvbnCommonPackage.dictionary,
        ...zxcvbnEnPackage.dictionary
      },
      graphs: zxcvbnCommonPackage.adjacencyGraphs,
      translations: zxcvbnEnPackage.translations
    });

    this.apiService
      .getApi()
      .pipe(takeUntil(this.destroy$))
      .subscribe((api: any) => {
        const passwordPolicy =
          api.authenticationStrategies.local.settings.passwordPolicy;
        this.passwordPolicy.set(passwordPolicy);

        const usernameGetter = () => this.signup.controls.username.value ?? '';

        this.signup.setControl(
          'password',
          new FormControl<string>('', {
            validators: [
              Validators.required,
              createPasswordPolicyValidator(
                passwordPolicy,
                (errs) => this.passwordErrorMessages.set(errs),
                usernameGetter()
              )
            ]
          })
        );

        this.signup.setControl(
          'passwordconfirm',
          new FormControl<string>('', {
            validators: [
              Validators.required,
              confirmPasswordValidator(
                () => this.signup.controls.password.value ?? ''
              )
            ]
          })
        );

        this.signup.controls.password.valueChanges
          .pipe(takeUntil(this.destroy$))
          .subscribe((value) => {
            this.onPasswordChanged(value ?? '');
          });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPasswordChanged(password: string) {
    const username = this.signup.controls.username.value ?? '';
    this.passwordStrength.set(evaluatePasswordStrength(password, username));
  }

  get passwordTooltipText(): string {
    const passwordPolicy = this.passwordPolicy();
    return passwordPolicy ? getPasswordTooltip(passwordPolicy) : '';
  }

  getCaptcha(): void {
    this.loadingCaptcha.set(true);
    const username = this.signup.controls.username.value;
    if (!username) {
      this.loadingCaptcha.set(false);
      return;
    }

    this.userService
      .signup(username)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.captcha.set({
          uri: response.captcha,
          token: response.token
        });
        this.loadingCaptcha.set(false);
      });
  }

  onCancel(): void {
    this.complete.emit({ reason: 'cancel' });
  }

  onSignup(): void {
    const password = this.signup.controls.password.value ?? '';
    const confirm = this.signup.controls.passwordconfirm.value ?? '';

    if (password !== confirm) {
      this.signup.controls.passwordconfirm.setErrors({ match: true });
    } else {
      const confirmControl = this.signup.controls.passwordconfirm;
      const currentErrors: ValidationErrors | null = confirmControl.errors;
      if (currentErrors?.['match']) {
        delete currentErrors['match'];
        confirmControl.setErrors(
          Object.keys(currentErrors).length ? currentErrors : null
        );
      }
    }

    this.signup.markAllAsTouched();

    if (this.signup.valid) {
      this.userService
        .signupVerify(this.signup.value, this.captcha().token)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.complete.emit({ reason: 'signup', user: response });
          },
          error: (response: any) => {
            if (response.status === 401) {
              this.getCaptcha();
            } else if (response.status === 403) {
              this.signup.controls.captchaText.setErrors({ invalid: true });
            } else if (response.status === 409) {
              this.captcha.set({});
              this.signup.controls.username.setErrors({ exists: true });
            }
          }
        });
    }
  }

  getPasswordErrorMessages(errors: any): string[] {
    if (errors?.['required']) return ['Password is required'];
    return this.passwordErrorMessages();
  }
}
