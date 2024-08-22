import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PasswordStrength } from '../../../entities/entities.password';
import { UserService } from '../../../user/user.service';
import { User } from 'core-lib-src/user';

export interface SignupEvent {
  reason: 'signup' | 'cancel'
  user?: User
}

@Component({
  selector: 'signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  @Output() complete = new EventEmitter<SignupEvent>()

  signup = new FormGroup({
    username: new FormControl<string>('', [Validators.required]),
    displayName: new FormControl<string>('', [Validators.required]),
    email: new FormControl<string>('', [Validators.email]),
    phone: new FormControl<string>(''),
    password: new FormControl<string>('', [Validators.required]),
    passwordconfirm: new FormControl<string>('', [Validators.required]),
    captchaText: new FormControl<string>('', [Validators.required])
  })

  passwordStrength?: PasswordStrength
  loadingCaptcha = false
  captcha: {
    uri?: string,
    token?: string
  } = {}

  constructor(
    private userService: UserService
  ) {}

  getCaptcha(): void {
    this.loadingCaptcha = true
    this.userService.signup(this.signup.controls.username.value).subscribe((response: any) => {
      this.captcha = {
        uri: response.captcha,
        token: response.token
      }

      this.loadingCaptcha = false;
    });
  }

  onCancel(): void {
    this.complete.emit({
      reason: 'cancel'
    })
  }

  onSignup(): void {
    if (this.signup.controls.password.value !== this.signup.controls.passwordconfirm.value) {
      this.signup.controls.password.setErrors({
        match: true
      });
    } else {
      if (this.signup.controls.password.value.length < 1) {
        this.signup.controls.password.setErrors({ required: true });
      } else {
        this.signup.controls.password.setErrors(null);
      }
    }
    this.signup.markAllAsTouched()

    if (this.signup.valid) {
      this.userService.signupVerify(this.signup.value, this.captcha.token).subscribe({
        next: (response: any) => {
          this.complete.emit({
            reason: 'signup',
            user: response
          })
        },
        error: ((response: any) => {
          if (response.status === 401) {
            this.getCaptcha();
          } else if (response.status === 403) {
            this.signup.controls.captchaText.setErrors({ invalid: true })
          } else if (response.status === 409) {
            this.captcha = {};
            this.signup.controls.username.setErrors({ exists: true })
          }
        })
      })
    }
  }
}
