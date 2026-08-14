import { Component, OnInit } from '@angular/core';
import { UserService } from '../../user/user.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core'
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common'
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en'
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PasswordResetSuccessDialog } from '../password/password-reset-success-dialog';
import { PasswordStrength, passwordStrengthScores } from '../../entities/password/password';
import { SessionService } from 'mage-web-app/http/session.service';
import { emailValidator } from 'mage-web-app/email/email';

@Component({
    selector: 'profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    standalone: false
})
export class ProfileComponent implements OnInit {
  user: any
  avatar: any
  saving = false

  profile = new FormGroup({
    username: new FormControl<string>({ value: '', disabled: true }, []),
    displayName: new FormControl<string>('', [Validators.required]),
    email: new FormControl<string>('', [emailValidator]),
    phone: new FormControl<string>('', []),
  })
  profileError?: string

  password = new FormGroup({
    currentPassword: new FormControl<string>('', [Validators.required]),
    newPassword: new FormControl<string>('', [Validators.required]),
    newPasswordConfirm: new FormControl<string>('', [Validators.required])
  })
  passwordError?: string

  passwordStrength?: PasswordStrength

  constructor(
    public dialog: MatDialog,
    private router: Router,
    private userService: UserService,
    private sessionService: SessionService,
    private snackbar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.user = this.sessionService.user
    this.setProfile(this.user)

    zxcvbnOptions.setOptions({
      dictionary: {
        ...zxcvbnCommonPackage.dictionary,
        ...zxcvbnEnPackage.dictionary,
      },
      graphs: zxcvbnCommonPackage.adjacencyGraphs,
      translations: zxcvbnEnPackage.translations,
    })
  }

  onSave(): void {
    this.profile.markAllAsTouched()
    if (this.profile.invalid) {
      return
    }

    this.saving = true
    this.profileError = undefined

    this.userService.saveProfile({
      avatar: this.avatar,
      displayName: this.profile.controls.displayName.value,
      email: this.profile.controls.email.value,
      phone: this.profile.controls.phone.value,
    }).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.Response) {
          this.saving = false
          this.user = event.body
          this.snackbar.open('Profile updated successfully', undefined, {
            duration: 3000
          })
                  this.profileError = 'Error updating profile, please try again later.'

        }
      },
      error: () => {
        this.saving = false
        this.profileError = 'Error updating profile, please try again later.'
      }
    })
  }

  onAvatar(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.avatar = file;
    }
  }

  onPasswordChanged(password: string) {
    if (password && password.length > 0) {
      const userInputs = [this.user.username, this.user.displayName, this.user.email].filter(Boolean)
      const score = password && password.length ? zxcvbn(password, userInputs).score : 0;
      this.passwordStrength = passwordStrengthScores[score]
    } else {
      this.passwordStrength = passwordStrengthScores[0]
    }
  }

  onCancelPassword(): void {
    this.password.setValue({
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: ""
    })
    this.password.markAsUntouched()
  }

  onResetPassword(): void {
    if (this.password.controls.newPassword.value !== this.password.controls.newPasswordConfirm.value) {
      this.password.controls.newPassword.setErrors({ matches: true });
    } else {
      this.password.controls.newPassword.setErrors(null);
    }
    this.password.markAllAsTouched()
    if (this.password.valid) {
      this.userService.updatePassword(this.password.controls.currentPassword.value, this.password.controls.newPassword.value).subscribe({
        next: () => {
          this.sessionService.clearSession()

          const dialogRef = this.dialog.open(PasswordResetSuccessDialog, {
            disableClose: true,
            autoFocus: false
          })
          dialogRef.afterClosed().subscribe(() => {
            this.router.navigate(['landing'])
          })
        },
        error: (response) => {
          if (response.status === 401) {
            this.password.controls.currentPassword.setErrors({invalid: true})
          } else {
            this.passwordError = response.error
          }
        }
      })
    }
  }

  onCancel(): void {
    this.setProfile(this.user)
  }

  onBack(): void {
    this.router.navigate(['home'])
  }

  private setProfile(user: any) {
    this.profile.setValue({
      username: user.username,
      displayName: user.displayName,
      email: user.email || "",
      phone: user.phone || ""
    })
  }

}