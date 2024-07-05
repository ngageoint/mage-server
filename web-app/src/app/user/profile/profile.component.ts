import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core'
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common'
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en'
import { MatDialog } from '@angular/material/dialog';
import { PasswordResetSuccessDialog } from '../password/password-reset-success-dialog';
import { PasswordStrength, passwordStrengthScores } from 'src/app/entities/password/entities.password';

@Component({
  selector: 'profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: any
  avatar: any
  saving = false

  info = new FormGroup({
    username: new FormControl<string>({ value: '', disabled: true }, []),
    displayName: new FormControl<string>('', [Validators.required]),
    email: new FormControl<string>('', [Validators.email]),
    phone: new FormControl<string>('', []),
  })
  infoError?: string

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
  ) { }

  ngOnInit(): void {
    this.user = this.userService.myself
    this.setInfo(this.user)

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
    this.saving = true

    this.userService.saveProfile({
      avatar: this.avatar,
      displayName: this.info.controls.displayName.value,
      email: this.info.controls.email.value,
      phone: this.info.controls.phone.value,
    }).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.Response) {
          this.saving = false
          this.user = event.body
        }
      },
      error: () => {
        this.infoError = 'Error updating profile, please try again later.'
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
      const score = password && password.length ? zxcvbn(password, [this.user.username, this.user.displayName, this.user.email]).score : 0;
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
    this.setInfo(this.user)
  }

  onBack(): void {
    this.router.navigate(['map'])
  }

  private setInfo(user: any) {
    this.info.setValue({
      username: user.username,
      displayName: user.displayName,
      email: user.email || "",
      phone: user.phone || ""
    })
  }

}