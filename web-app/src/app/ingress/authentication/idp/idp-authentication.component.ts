import { Component, DestroyRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AuthenticationStrategy } from '../../../api/api.entity';
import { UserService } from '../../../user/user.service';
import { SignupEvent } from '../@types/signup';
import { User } from '@ngageoint/mage.web-core-lib/user';
@Component({
    selector: 'idp-authentication',
    templateUrl: './idp-authentication.component.html',
    styleUrls: ['./idp-authentication.component.scss'],
    standalone: false
})
export class IdpAuthenticationComponent {
  @Input() strategy: AuthenticationStrategy
  @Output() created = new EventEmitter<SignupEvent>()
  @Output() authenticated = new EventEmitter<{ user: User, token: string }>()

  error: {
    title: string,
    message: string
  }

  private readonly destroyRef: DestroyRef = inject(DestroyRef)
  private signinSubscription?: Subscription

  constructor(
    private userService: UserService
  ) {}

  signin() {
    this.error = undefined

    this.signinSubscription?.unsubscribe()
    this.signinSubscription = this.userService.idpSignin(this.strategy.name).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        switch (result.status) {
          case 'authenticated':
            this.authenticated.emit({ user: result.user, token: result.token })
            break
          case 'unauthorized':
            this.created.emit({
              reason: 'signup',
              user: result.user
            })
            break
          case 'popupBlocked':
            this.error = {
              title: 'Sign In Window Blocked',
              message: 'Your browser blocked the sign in window. Allow pop-ups for this site, then try again.'
            }
            break
          case 'failed':
            this.error = {
              title: 'Error Signing In',
              message: 'There was a problem signing in, please try again or contact a Mage administrator for assistance.'
            }
            break
        }
      }
    })
  }
}
