import { Component, EventEmitter, Input, Output, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core'
import { UserService } from 'mage-web-app/user/user.service'
import { AuthenticationStrategy } from '../local-signin/local-signin.component'
import { zxcvbn } from '@zxcvbn-ts/core'
import { take } from 'rxjs/operators'

export interface SignupAccount {
  username?: string
  displayName?: string
  email?: string
  phone?: string
  password?: string
  passwordconfirm?: string
  captchaText?: string
}

const passwordStrengthMap: { [key: number]: { type: string; text: string } } = {
  0: { type: 'danger', text: 'Weak' },
  1: { type: 'warning', text: 'Fair' },
  2: { type: 'info', text: 'Good' },
  3: { type: 'primary', text: 'Strong' },
  4: { type: 'success', text: 'Excellent' }
}

@Component({
  selector: 'local-signup',
  templateUrl: './local-signup.component.html',
  styleUrls: ['./local-signup.component.scss']
})
export class LocalSignupComponent implements OnInit, AfterViewInit {
  @Input() strategy: AuthenticationStrategy
  @Output() onCancel = new EventEmitter<void>()
  @Output() onSuccess = new EventEmitter<any>()

  @ViewChild('usernameInput') usernameInput: ElementRef<HTMLInputElement>
  @ViewChild('passwordInput') passwordInput: ElementRef<HTMLInputElement>
  @ViewChild('captchaInput') captchaInput: ElementRef<HTMLInputElement>

  account: SignupAccount = {}
  captcha: { uri?: string; token?: string } = {}
  loadingCaptcha = false

  passwordStrengthScore = 0
  passwordStrengthType = ''
  passwordStrength = ''
  passwordStrengthProgress = 0

  statusTitle = ''
  statusMessage = ''
  showSnackbar = false

  usernameValid = true
  passwordValid = true
  passwordConfirmValid = true
  captchaValid = true

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.account = {}
  }

  ngAfterViewInit(): void {}

  getCaptcha(): void {
    if (!this.account.username) return

    this.loadingCaptcha = true
    this.userService
      .signup(this.account.username)
      .pipe(take(1))
      .subscribe({
        next: (data: any) => {
          this.captcha = {
            uri: data?.captcha,
            token: data?.token
          }
          this.loadingCaptcha = false
        },
        error: (err: any) => {
          this.loadingCaptcha = false
          this.showStatusMessage('Could Not Load Captcha', err?.error?.data || err?.error?.message || err?.message || 'Unknown error')
        }
      })
  }

  verify(): void {
    this.passwordConfirmValid = this.account.password === this.account.passwordconfirm
    this.passwordValid = this.passwordConfirmValid

    if (!this.isFormValid()) return
    if (!this.captcha?.token) {
      this.captchaValid = false
      this.showStatusMessage('Captcha Required', 'Please request and complete the captcha before continuing.')
      return
    }

    this.userService
      .signupVerify(this.account, this.captcha.token)
      .pipe(take(1))
      .subscribe({
        next: (response: any) => {
          this.signupComplete(response)
        },
        error: (response: any) => {
          const status = response?.status
          if (status === 401) {
            this.getCaptcha()
          } else if (status === 409) {
            this.captcha = {}
            this.usernameValid = false
            this.captchaValid = false
          }
          this.signupFailed(response)
        }
      })
  }

  private isFormValid(): boolean {
    return !!(
      this.account.username &&
      this.account.displayName &&
      this.account.password &&
      this.account.passwordconfirm &&
      this.account.captchaText &&
      this.passwordConfirmValid
    )
  }

  private signupComplete(data: any): void {
    this.account = {}
    this.onSuccess.emit(data)
  }

  private signupFailed(response: any): void {
    const msg =
      response?.error?.data ||
      response?.error?.errorMessage ||
      response?.error?.message ||
      response?.message ||
      'Could not create account.'
    this.showStatusMessage('Could Not Create Account', msg)
  }

  onPasswordChange(): void {
    const score =
      this.account.password && this.account.password.length
        ? zxcvbn(this.account.password, [
            this.account.username || '',
            this.account.displayName || '',
            this.account.email || ''
          ]).score
        : 0

    this.passwordStrengthScore = score + 1
    this.passwordStrengthType = passwordStrengthMap[score].type
    this.passwordStrength = passwordStrengthMap[score].text
    this.passwordStrengthProgress = this.passwordStrengthScore / 5
  }

  showStatusMessage(title: string, message: string): void {
    this.statusTitle = title
    this.statusMessage = message
    this.showSnackbar = true
    setTimeout(() => {
      this.showSnackbar = false
    }, 5000)
  }

  dismissSnackbar(): void {
    this.showSnackbar = false
  }

  cancelSignup(): void {
    this.onCancel.emit()
  }
}
