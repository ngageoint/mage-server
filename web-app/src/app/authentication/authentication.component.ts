import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Api, AuthenticationStrategy } from '../api/api.entity';
import * as _ from 'underscore';
import { UserService } from '../user/user-service.service';

@Component({
  selector: 'authentication',
  templateUrl: './authentication.component.html',
  styleUrls: ['./authentication.component.scss']
})
export class AuthenticationComponent implements OnInit {
  @Input() hideSignup: boolean

  api: Api
  strategy: any
  thirdPartyStrategies: any
  localAuthenticationStrategy: any

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.route.data.subscribe(({ api }) => {
      this.api = api

      this.localAuthenticationStrategy = this.api?.authenticationStrategies['local'];
      if (this.localAuthenticationStrategy) {
        this.localAuthenticationStrategy.name = 'local';
      }

      this.thirdPartyStrategies = _.map(_.omit(this.api?.authenticationStrategies, this.localStrategyFilter), function (strategy: AuthenticationStrategy, name: string) {
        strategy.name = name;
        return strategy;
      });
    })
  }

  localStrategyFilter(strategy: AuthenticationStrategy, name: string) {
    return name === 'local';
  }

  onSignin($event: any) {
    this.userService.authorize($event.token, null).subscribe({
      next: (response) => {
        const disclaimer = this.api.disclaimer || {};
        if (disclaimer.show) {
          this.router.navigate(['disclaimer'], { relativeTo: this.route.parent });
        } else {
          // TODO set token event"
          // $rootScope.$broadcast('event:user', {user: service.myself, token: LocalStorageService.getToken(), isAdmin: service.amAdmin});
          this.router.navigate(['map']);
        }
      },
      error: () => {
        this.router.navigate(['authorize'], { queryParams: { token: $event.token }, relativeTo: this.route.parent });
      }
    })
  }

  onSignup($event: any) {

  }
}
