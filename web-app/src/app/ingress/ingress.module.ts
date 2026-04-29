import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IngressComponent } from './ingress.component';
import { InitializeComponent } from './intialize/initialize.component';
import { AuthenticationComponent } from './authentication/authentication.component';
import { LocalAuthenticationComponent } from './authentication/local/local-authentication.component';
import { SignupComponent } from './authentication/local/signup.component';
import { AuthorizationComponent } from './authorization/authorization.component';
import { DisclaimerComponent } from './disclaimer/disclaimer.component';
import { IdpAuthenticationComponent } from './authentication/idp/idp-authentication.component';
import { AccountStatusComponent } from './account-status/account-status.component';
import { AuthenticationDialogComponent } from './authentication/authentication-dialog.component';
import { LdapAuthenticationComponent } from './authentication/ldap/ldap-authentication.component';
import { AuthenticationButtonComponent } from './authentication/button/authentication-button.component';

@NgModule({
  imports: [
    CommonModule,
    IngressComponent,
    InitializeComponent,
    AuthenticationComponent,
    LocalAuthenticationComponent,
    SignupComponent,
    AuthorizationComponent,
    DisclaimerComponent,
    IdpAuthenticationComponent,
    AccountStatusComponent,
    AuthenticationDialogComponent,
    LdapAuthenticationComponent,
    AuthenticationButtonComponent
  ],
  exports: [
    IngressComponent
  ]
})
export class IngressModule {}