import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AuthenticationStrategy } from '../../../api/api.entity';
import { UserService } from '../../../user/user.service';
@Component({
  selector: 'idp-authentication',
  templateUrl: './idp-authentication.component.html',
  styleUrls: ['./idp-authentication.component.scss']
})
export class IdpAuthenticationComponent {
  @Input() strategy: AuthenticationStrategy
  @Output() authenticated = new EventEmitter<any>()

  error: {
    title: string,
    message: string
  }

  constructor(
    private userService: UserService
  ) {}

  signin() {
    this.userService.idpSignin(this.strategy.name).subscribe({
      next: (response: any) => {
        if (!response.token || !response.user) {
          let message = 'There was a problem signing in, Please contact a Mage administrator for assistance.'
          if (response.user) {
            if (!response.user.active) {
              message = 'Your account has been created but it is not active. A Mage administrator needs to activate your account before you can log in.'
            } else if (!response.user.enabled) {
              message = 'Your account has been disabled, please contact a Mage administrator for assistance.'
            }
          }

          this.error.title = 'Signin Failed'
          this.error.message = message
          return;
        }

        this.authenticated.emit(response)
      },
      error: (error: any) => {
        this.error = {
          title: 'Error signing in',
          message: error.data || 'Please check your username and password and try again.'
        };
      }
    })
  }
}
