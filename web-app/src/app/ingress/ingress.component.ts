import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Api, AuthenticationStrategy } from '../api/api.entity';
import { UserService } from '../user/user.service';
import { AuthorizationEvent } from './authorization/authorization.component';
import { DiscalimeCloseEvent, DiscalimerCloseReason } from './disclaimer/disclaimer.component';
import { animate, style, transition, trigger } from '@angular/animations';
import { SignupEvent } from './authentication/@types/signup';
import { User } from 'core-lib-src/user';
import { InitializedEvent } from './intialize/initialize.component';
import * as _ from 'underscore';
import { SessionService } from 'mage-web-app/http/session.service';

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
  state: IngressState;
}

class Signin extends Ingress {
  state = IngressState.Signin;
}

class Signup extends Ingress {
  state = IngressState.Signup;
}

class Authenticated extends Ingress {
  state = IngressState.Authorization;
  readonly authenticationToken: string;

  constructor(authenticationToken: string) {
    super();
    this.authenticationToken = authenticationToken;
  }
}

class Authorized extends Ingress {
  state = IngressState.Disclaimer;
  readonly apiToken: string;

  constructor(apiToken: string) {
    super();
    this.apiToken = apiToken;
  }
}

class ActiveAccount extends Ingress {
  state = IngressState.ActiveAccount;
}

class InactiveAccount extends Ingress {
  state = IngressState.InactiveAccount;
}

class DisabledAccount extends Ingress {
  state = IngressState.DisabledAccount;
}

class Initialize extends Ingress {
  state = IngressState.Initialize;
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
                animate('250ms', style({ transform: 'translateX(0%)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('250ms', style({ transform: 'translateX(-100%)', opacity: 0 }))
            ])
        ])
    ],
    standalone: false
})
export class IngressComponent implements OnChanges {
  @Input() api: Api;
  @Input() landing: boolean;
  @Output() complete = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() title = new EventEmitter<string>();

  public readonly IngressState: typeof IngressState = IngressState;

  ingress: Ingress = new Signin();
  strategy: any;
  thirdPartyStrategies: any;
  localAuthenticationStrategy: any;

  constructor(
    private userService: UserService,
    private sessionService: SessionService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.api?.currentValue?.initial === true) {
      this.ingress = new Initialize();
      this.emitTitle();
    }
  }

  private emitTitle(): void {
    const titles: Record<IngressState, string> = {
      [IngressState.Initialize]: 'Initialize Mage',
      [IngressState.Signin]: 'Sign in to Mage',
      [IngressState.Signup]: 'Create Account',
      [IngressState.Authorization]: 'Access Code',
      [IngressState.Disclaimer]: this.api?.disclaimer?.title || 'Terms & Conditions',
      [IngressState.ActiveAccount]: 'Account Created',
      [IngressState.InactiveAccount]: 'Account Pending',
      [IngressState.DisabledAccount]: 'Account Disabled',
    };
    this.title.emit(titles[this.ingress.state]);
  }

  localStrategyFilter(_strategy: AuthenticationStrategy, name: string) {
    return name === 'local';
  }

  getAuthenticationToken(): string | undefined {
    return (this.ingress as Authenticated)?.authenticationToken;
  }

  onSignup(): void {
    this.ingress = new Signup();
    this.emitTitle();
  }

  onCreated($event: SignupEvent): void {
    if ($event.reason === 'signup') {
      if (!$event.user.active) {
        this.ingress = new InactiveAccount();
      } else if (!$event.user.enabled) {
        this.ingress = new DisabledAccount();
      } else {
        this.ingress = new ActiveAccount();
      }
    } else {
      this.ingress = new Signin();
    }
    this.emitTitle();
  }

  onAuthenticated($event: { user: User; token: string }) {
    this.userService.authorize($event.token, 'refresh').subscribe({
      next: (response) => {
        this.authorized(response.token);
      },
      error: () => {
        this.ingress = new Authenticated($event.token);
        this.emitTitle();
      }
    });
  }

  onAuthorized($event: AuthorizationEvent) {
    this.authorized($event.token);
  }

  private authorized(token: string) {
    if (this.api.disclaimer?.show === true) {
      this.ingress = new Authorized(token);
      this.emitTitle();
    } else {
      this.sessionService.setToken(token);
      this.complete.emit();
    }
  }

  onDisclaimer($event: DiscalimeCloseEvent) {
    if ($event.reason === DiscalimerCloseReason.ACCEPT) {
      const ingress = this.ingress as Authorized;
      this.sessionService.setToken(ingress.apiToken)
      this.complete.emit();
    } else {
      this.sessionService.clearSession();
      if (this.landing) {
        this.ingress = new Signin();
        this.emitTitle();
      } else {
        this.cancel.emit();
      }
    }
  }

  onAccountStatus(): void {
    this.ingress = new Signin();
    this.emitTitle();
  }

  onInitialized($event: InitializedEvent): void {
    this.sessionService.setToken($event.token);
    this.complete.emit();
  }
}
