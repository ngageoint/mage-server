import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { Api, AuthenticationStrategy } from '../../api/api.entity'
import { User } from '../../entities/user/entities.user'
import * as _ from 'underscore'

export interface AuthenticationEvent {
  user: User,
  authenticationToken: string
}

@Component({
  selector: 'authentication',
  templateUrl: './authentication.component.html',
  styleUrls: ['./authentication.component.scss']
})
export class AuthenticationComponent implements OnChanges {
  @Input() api: Api
  @Input() landing: boolean = false

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
}
