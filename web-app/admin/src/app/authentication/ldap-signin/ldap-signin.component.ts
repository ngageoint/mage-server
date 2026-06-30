import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UserService } from 'mage-web-app/user/user.service';
import { SigninEvent } from '../auth.types';
import {
  AuthenticationStrategy,
  ContactInfo
} from '../local-signin/local-signin.component';

@Component({
  selector: 'ldap-signin',
  templateUrl: './ldap-signin.component.html',
  styleUrls: ['./ldap-signin.component.scss']
})
export class LdapSigninComponent {
  @Input() strategy: AuthenticationStrategy;
  @Output() onSignin = new EventEmitter<SigninEvent>();
  @Output() onCancel = new EventEmitter<void>();

  username = '';
  password = '';

  usernameValid = true;
  passwordValid = true;

  statusTitle = '';
  statusMessage = '';
  info: ContactInfo;
  contactOpen: any = null;

  constructor(private userService: UserService) {}

  signin(): void {
    this.usernameValid = true;
    this.passwordValid = true;
    this.statusTitle = '';
    this.statusMessage = '';

    if (!this.username || this.username.trim() === '')
      this.usernameValid = false;
    if (!this.password || this.password.trim() === '')
      this.passwordValid = false;

    if (!this.usernameValid || !this.passwordValid) return;

    this.userService.ldapSignin(this.username.trim(), this.password).subscribe({
      next: (response: any) => {
        const user = response?.user;
        const token = response?.token;

        if (!token || !user) {
          let message =
            'There was a problem signing in, Please contact a MAGE administrator for assistance.';
          if (user) {
            if (user.active === false) {
              message =
                'Your account has been created but it is not active. A MAGE administrator needs to activate your account before you can log in.';
            } else if (user.enabled === false) {
              message =
                'Your account has been disabled, please contact a MAGE administrator for assistance.';
            }
          }

          this.statusTitle = 'Signin Failed';
          this.statusMessage = message;
          this.info = {
            statusTitle: this.statusTitle,
            statusMessage: this.statusMessage,
            id: this.username
          };
          this.contactOpen = { opened: true };
          return;
        }

        this.onSignin.emit({
          user,
          token,
          strategy: this.strategy?.name
        });
      },
      error: (err: any) => {
        if (err?.status === 401) {
          this.onCancel.emit();
          return;
        }

        this.statusTitle = 'Error signing in';
        this.statusMessage =
          err?.error?.errorMessage ||
          err?.error?.data ||
          err?.error?.message ||
          err?.message ||
          'Please check your username and password and try again.';

        this.info = {
          statusTitle: this.statusTitle,
          statusMessage: this.statusMessage,
          id: this.username
        };
        this.contactOpen = { opened: true };
      }
    });
  }

  onContactClose(): void {
    this.contactOpen = null;
  }
}
