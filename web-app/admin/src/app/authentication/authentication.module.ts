import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule as MatSnackBarModule } from '@angular/material/snack-bar';

import { ContactModule } from '../contact/contact.module';
import { LocalSigninComponent } from './local-signin/local-signin.component';
import { IdpSigninComponent } from './idp-signin/idp-signin.component';
import { LdapSigninComponent } from './ldap-signin/ldap-signin.component';
import { LocalSignupComponent } from './local-signup/local-signup.component';
import { SigninComponent } from './signin/signin.component';
import { AuthorizeComponent } from './authorize/authorize.component';
import { AuthenticationComponent } from './authentication/authentication.component';
import { SigninModalComponent } from './signin-modal/signin-modal.component';

@NgModule({
  declarations: [
    LocalSigninComponent,
    IdpSigninComponent,
    LdapSigninComponent,
    LocalSignupComponent,
    SigninComponent,
    AuthorizeComponent,
    AuthenticationComponent,
    SigninModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    ContactModule
  ],
  exports: [
    LocalSigninComponent,
    IdpSigninComponent,
    LdapSigninComponent,
    LocalSignupComponent,
    SigninComponent,
    AuthorizeComponent,
    AuthenticationComponent,
    SigninModalComponent
  ],
  providers: [
    {
      provide: 'httpBuffer',
      useFactory: (i: any) => i.get('httpBuffer'),
      deps: ['$injector']
    }
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AuthenticationModule {}
