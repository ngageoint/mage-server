import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from 'mage-web-app/user/user.service';
import { AuthService } from '../auth.service';
import { Api } from '../signin/signin.component';
import { AuthenticationStrategy } from '../local-signin/local-signin.component';
import { SigninEvent } from '../auth.types';

type AuthenticationAction =
  | 'setup'
  | 'signin'
  | 'signup'
  | 'disclaimer'
  | 'authorize-device'
  | 'inactive-account'
  | 'active-account'
  | 'disabled-account'
  | 'about';

@Component({
  selector: 'authentication',
  templateUrl: './authentication.component.html',
  styleUrls: ['./authentication.component.scss']
})
export class AuthenticationComponent implements OnInit {
  @Input() api!: Api;
  @Input() hideSignup = false;
  @Output() onSuccess = new EventEmitter<void>();
  @Output() onFailure = new EventEmitter<void>();

  action: AuthenticationAction | null = null;
  user: any;
  token = '';
  strategy = '';
  localAuthenticationStrategy: AuthenticationStrategy | null = null;

  constructor(
    private userService: UserService,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Angular Router replacement for $stateParams
    const qp = this.route.snapshot.queryParamMap;
    this.action = (qp.get('action') as AuthenticationAction) || null;
    this.strategy = qp.get('strategy') || '';

    if (this.api?.initial) {
      this.action = 'setup';
    }
  }

  returnToSignin(): void {
    this.userService.logout();
    this.action = 'signin';
    this.onFailure.emit();
  }

  onSignup(): void {
    this.action = 'signup';
  }

  showAbout(): void {
    this.action = 'about';
  }

  showSignupSuccess(account: any): void {
    this.action = account?.active ? 'active-account' : 'inactive-account';
  }

  authorized(): void {
    const disclaimer = this.api?.disclaimer || { show: false };
  
    if (!disclaimer.show) {
      this.onSuccess.emit();
      return;
    }
  
    this.action = 'disclaimer';
  }  

  acceptDisclaimer(): void {
    this.userService.acceptDisclaimer();
    this.onSuccess.emit();
  }  

  onSignin(event: SigninEvent): void {
    this.user = event.user;
    this.token = event.token;
    this.strategy = event.strategy;
    this.action = 'authorize-device';
  }
}
