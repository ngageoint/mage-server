import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IngressComponent } from './ingress.component';
import { InitializeComponent } from './intialize/initialize.component';
import { AuthenticationComponent } from './authentication/authentication.component';
import { LocalAuthenticationComponent } from './authentication/local/local-authentication.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { SignupComponent } from './authentication/local/signup.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthorizationComponent } from './authorization/authorization.component';
import { DisclaimerComponent } from './disclaimer/disclaimer.component';
import { MatButtonModule } from '@angular/material/button';
import { IdpAuthenticationComponent } from './authentication/idp/idp-authentication.component';
import { AccountStatusComponent } from './account-status/account-status.component';
import { AuthenticationDialogComponent } from './authentication/authentication-dialog.component';
import { LdapAuthenticationComponent } from './authentication/ldap/ldap-authentication.component';
import { AuthenticationButtonComponent } from './authentication/button/authentication-button.component';

@NgModule({
  declarations: [],
  imports: [],
  exports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    ReactiveFormsModule
  ]
})
class AngularModule { }

@NgModule({
  declarations: [
    AccountStatusComponent,
    AuthenticationComponent,
    AuthenticationButtonComponent,
    AuthenticationDialogComponent,
    AuthorizationComponent,
    DisclaimerComponent,
    IdpAuthenticationComponent,
    IngressComponent,
    InitializeComponent,
    LdapAuthenticationComponent,
    LocalAuthenticationComponent,
    SignupComponent
  ],
  imports: [
    AngularModule
  ],
  exports: [
    IngressComponent
  ]
})
export class IngressModule { }
