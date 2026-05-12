import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { Api, AuthenticationStrategy } from '../../api/api.entity'
import { User } from 'core-lib-src/user'
import * as _ from 'underscore'
import { CommonModule } from '@angular/common'
import { AuthorizationComponent } from '../authorization/authorization.component'
import { IdpAuthenticationComponent } from './idp/idp-authentication.component'
import { LdapAuthenticationComponent } from './ldap/ldap-authentication.component'
import { LocalAuthenticationComponent } from './local/local-authentication.component'
import { SignupComponent } from './local/signup.component'

export interface AuthenticationEvent {
  user: User,
  authenticationToken: string
}

@Component({
  selector: 'authentication',
  standalone: true,
  imports: [
    CommonModule,
    LocalAuthenticationComponent,
    IdpAuthenticationComponent,
    LdapAuthenticationComponent,
    SignupComponent,
    AuthorizationComponent
  ],
  templateUrl: './authentication.component.html',
  styleUrls: ['./authentication.component.scss']
})
export class AuthenticationComponent implements OnChanges {
  @Input() api: Api
  @Input() landing: boolean = false

  @Output() signup = new EventEmitter<void>()
  @Output() authenticated = new EventEmitter<{ user: User, token: string}>()

  strategy: any
  thirdPartyStrategies: any
  localAuthenticationStrategy: any

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.api) {
      this.api = changes.api.currentValue
      this.localAuthenticationStrategy = this.api?.authenticationStrategies['local']
      if (this.localAuthenticationStrategy) {
        this.localAuthenticationStrategy.name = 'local'
      }

      this.thirdPartyStrategies = _.map(_.omit(this.api?.authenticationStrategies, this.localStrategyFilter), function (strategy: AuthenticationStrategy, name: string) {
        strategy.name = name
        return strategy
      })
    }
  }

  localStrategyFilter(_strategy: AuthenticationStrategy, name: string) {
    return name === 'local'
  }

  signin($event: { user: User, token: string }) {
    this.authenticated.emit($event)
  }

  onSignup(): void {
    this.signup.emit()
  }
}
