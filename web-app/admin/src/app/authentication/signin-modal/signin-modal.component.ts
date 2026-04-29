import { Component, Inject } from '@angular/core';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AuthService } from '../auth.service';
import { UserService } from 'mage-web-app/user/user.service';
import { LocalStorageService } from 'src/app/http/local-storage.service';
import { Api } from '../signin/signin.component';
import { CommonModule } from '@angular/common';
import { AuthenticationComponent } from '../../../../../src/app/ingress/authentication/authentication.component';

@Component({
  selector: 'signin-modal',
  standalone: true,
  imports: [
    CommonModule,
    AuthenticationComponent
  ],
  templateUrl: './signin-modal.component.html',
  styleUrls: ['./signin-modal.component.scss']
})
export class SigninModalComponent {
  api: Api;
  hideSignup = true;

  constructor(
    public dialogRef: MatDialogRef<SigninModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private authService: AuthService,
    private userService: UserService,
    private localStorageService: LocalStorageService
  ) {
    this.api = data.api;
  }
  
  onAuthFlowSuccess(): void {
    const token = this.localStorageService.getToken();

    if (token) {
      this.authService.loginConfirmed({ token });
    } else {
      this.authService.loginConfirmed();
    }

    this.dialogRef.close({ success: true });
  }

  logout(): void {
    this.userService.logout();
    this.authService.logout();
    this.dialogRef.close({ logout: true });
  }
}
