import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AuthenticationStrategy } from '../../../api/api.entity';
import { UserService } from '../../../user/user.service';
import { SignupEvent } from '../@types/signup';
@Component({
    selector: 'idp-authentication',
    templateUrl: './idp-authentication.component.html',
    styleUrls: ['./idp-authentication.component.scss'],
    standalone: false
})
export class IdpAuthenticationComponent {
  @Input() strategy: AuthenticationStrategy
  @Output() created = new EventEmitter<SignupEvent>()
  @Output() authenticated = new EventEmitter<any>()

  error: {
    title: string,
    message: string
  }

  constructor(
    private userService: UserService
  ) {}

  signin() {
    this.error = undefined

    this.userService.idpSignin(this.strategy.name).subscribe({
      next: (response: any) => {
        if (!response.user) {
          this.error = {
            title: 'Error Signing In',
            message: 'There was a problem signing in, please try again or contact a Mage administrator for assistance.'
          }
        } else if (!response.token) {
          this.created.emit({
            reason: 'signup',
            user: response.user
          })
        } else {
          this.authenticated.emit(response)
        }
      }
    })
  }
}
