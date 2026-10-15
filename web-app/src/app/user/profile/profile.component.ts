import { Component, OnInit, inject, signal } from '@angular/core';
import { UserService } from '../../user/user.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core'
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common'
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en'
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { UserAvatarModule } from '../user-avatar/user-avatar.module';
import { PasswordResetSuccessDialog } from '../password/password-reset-success-dialog';
import { PasswordStrength, passwordStrengthScores } from '../../entities/password/password';
import { SessionService } from 'mage-web-app/http/session.service';
import { emailValidator } from 'mage-web-app/email/email';

@Component({
    selector: 'profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    imports: [
      ReactiveFormsModule,
      MatButtonModule,
      MatCardModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatProgressBarModule,
      MatToolbarModule,
      UserAvatarModule
    ]
})
export class ProfileComponent implements OnInit {
  private readonly dialog: MatDialog = inject(MatDialog)
  private readonly router: Router = inject(Router)
  private readonly userService: UserService = inject(UserService)
  private readonly sessionService: SessionService = inject(SessionService)
  private readonly snackbar: MatSnackBar = inject(MatSnackBar)

  readonly user = signal<any>(null)
  avatar: any
  readonly saving = signal(false)

  profile = new FormGroup({
    username: new FormControl<string>({ value: '', disabled: true }, []),
    displayName: new FormControl<string>('', [Validators.required]),
    email: new FormControl<string>('', [emailValidator]),
    phone: new FormControl<string>('', []),
  })

  password = new FormGroup({
    currentPassword: new FormControl<string>('', [Validators.required]),
    newPassword: new FormControl<string>('', [Validators.required]),
    newPasswordConfirm: new FormControl<string>('', [Validators.required])
  })
  readonly passwordError = signal<string | undefined>(undefined)

  passwordStrength?: PasswordStrength

  ngOnInit(): void {
    this.user.set(this.sessionService.user)
    this.setProfile(this.user())

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

    this.saving.set(true)

    this.userService.saveProfile({
      avatar: this.avatar,
      displayName: this.profile.controls.displayName.value,
      email: this.profile.controls.email.value,
      phone: this.profile.controls.phone.value,
    }).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.Response) {
          this.saving.set(false)
          this.user.set(event.body)
          this.snackbar.open('Profile updated successfully', undefined, {
            duration: 3000
          })
        }
      },
      error: (err) => {
        this.saving.set(false)
        const message = (typeof err.error === 'string' && err.error) || 'Error updating profile, please try again later.'
        this.snackbar.open(message, undefined, {
          duration: 6000
        })
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
      const user = this.user()
      const userInputs = [user.username, user.displayName, user.email].filter(Boolean)
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
            this.passwordError.set(response.error)
          }
        }
      })
    }
  }

  onCancel(): void {
    this.setProfile(this.user())
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
