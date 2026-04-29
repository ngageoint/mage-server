import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [
    CommonModule,
    ContactModule,
    LocalSigninComponent,
    IdpSigninComponent,
    LdapSigninComponent,
    LocalSignupComponent,
    SigninComponent,
    AuthorizeComponent,
    AuthenticationComponent,
    SigninModalComponent
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
