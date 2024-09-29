import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core'
import { Api, AuthenticationStrategy } from '../api/api.entity'
import { UserService } from '../user/user.service'
import { AuthorizationEvent } from './authorization/authorization.component'
import { LocalStorageService } from '../http/local-storage.service'
import { DiscalimeCloseEvent, DiscalimerCloseReason } from './disclaimer/disclaimer.component'
import { animate, style, transition, trigger } from '@angular/animations'
import { SignupEvent } from './authentication/local/signup.component'
import { User } from 'core-lib-src/user'
import { InitializedEvent } from './intialize/initialize.component'
import * as _ from 'underscore'

enum IngressState {
  Initialize,
  Signin,
  Signup,
  Authorization,
  Disclaimer,
  ActiveAccount,
  DisabledAccount,
  InactiveAccount
}

class Ingress {
  state: IngressState
}

class Signin extends Ingress {
  state = IngressState.Signin
}

class Signup extends Ingress {
  state = IngressState.Signup
}

class Authenticated extends Ingress {
  state = IngressState.Authorization
  readonly authenticationToken: string

  constructor(authenticationToken: string) {
    super()
    this.authenticationToken = authenticationToken
  }
}

class Authorized extends Ingress {
  state = IngressState.Disclaimer
  readonly apiToken: string

  constructor(apiToken: string) {
    super()
    this.apiToken = apiToken
  }
}

class ActiveAccount extends Ingress {
  state = IngressState.ActiveAccount
}

class InactiveAccount extends Ingress {
  state = IngressState.InactiveAccount
}

class Initialize extends Ingress {
  state = IngressState.Initialize
}

@Component({
  selector: 'ingress',
  templateUrl: './ingress.component.html',
  styleUrls: ['./ingress.component.scss'],
  animations: [
    trigger('disableOnEnter', [
      transition(':enter', [])
    ]),
    trigger('slide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('250ms', style({ transform: 'translateX(0%)' })),
      ]),
      transition(':leave', [
        animate('250ms', style({ transform: 'translateX(-100%)' }))
      ])
    ])
  ]
})
export class IngressComponent implements OnChanges {
  @Input() api: Api
  @Input() landing: boolean
  @Output() complete = new EventEmitter<void>()

  public readonly IngressState: typeof IngressState = IngressState

  ingress: Ingress = new Signin()
  strategy: any
  thirdPartyStrategies: any
  localAuthenticationStrategy: any

  constructor(
    private userService: UserService,
    private localStorageService: LocalStorageService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.api?.currentValue?.initial === true) {
      this.ingress = new Initialize()
    }
  }

  localStrategyFilter(_strategy: AuthenticationStrategy, name: string) {
    return name === 'local'
  }

  getAuthenticationToken(): string | undefined {
    return (this.ingress as Authenticated)?.authenticationToken
  }

  onSignup(): void {
    this.ingress = new Signup()
  }

  signup($event: SignupEvent): void {
    if ($event.reason === 'signup') {
      this.ingress = $event.user.active ? new ActiveAccount() : new InactiveAccount()
    } else {
      this.ingress = new Signin()
    }
  }

  onAuthenticated($event: { user: User, token: string }) {
    this.userService.authorize($event.token, null).subscribe({
      next: (response) => {
        this.authorized(response.token)
      },
      error: () => {
        this.ingress = new Authenticated($event.token)
      }
    })
  }

  onAuthorized($event: AuthorizationEvent) {
    this.authorized($event.token)
  }

  private authorized(token: string) {
    if (this.api.disclaimer?.show === true) {
      this.ingress = new Authorized(token)
    } else {
      this.localStorageService.setToken(token)
      this.complete.emit()
    }
  }

  onDisclaimer($event: DiscalimeCloseEvent) {
    if ($event.reason === DiscalimerCloseReason.ACCEPT) {
      const ingress = this.ingress as Authorized
      this.localStorageService.setToken(ingress.apiToken)
      this.complete.emit()
    } else {
      this.ingress = new Signin()
    }
  }

  onAccountStatus(): void {
    this.ingress = new Signin()
  }

  onInitialized($event: InitializedEvent): void {
    this.localStorageService.setToken($event.token)
    this.complete.emit()
  }
}
