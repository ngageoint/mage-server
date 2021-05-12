import { Component } from '@angular/core'
import { Strategy, StrategyState } from '../admin-settings.model';
import { TypeChoice } from './admin-create.model';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';

@Component({
    selector: 'authentication-create',
    templateUrl: './authentication-create.component.html',
    styleUrls: ['./authentication-create.component.scss'],
    animations: [
        trigger('slide', [
          state('1', style({ height: '*', opacity: 1, })),
          state('0', style({ height: '0', opacity: 0 })),
          transition('1 => 0', animate('400ms ease-in-out')),
          transition('0 => 1', animate('400ms ease-in-out'))
        ]),
        trigger('rotate', [
          state('0', style({ transform: 'rotate(0)' })),
          state('1', style({ transform: 'rotate(45deg)' })),
          transition('1 => 0', animate('250ms ease-out')),
          transition('0 => 1', animate('250ms ease-in'))
        ])
      ]
})
export class AuthenticationCreateComponent {
    breadcrumbs: AdminBreadcrumb[] = [{
        title: 'Settings',
        icon: 'build',
        state: {
          name: 'admin.settings'
        }
      }]
      
    readonly typeChoices: TypeChoice[] = [{
        title: 'Local',
        description: 'Local account.',
        type: 'local'
    }, {
        title: 'Google',
        description: 'Google account.',
        type: 'google'
    }, {
        title: 'GeoAxis',
        description: 'GeoAxis account.',
        type: 'geoaxis'
    }, {
        title: 'LDAP',
        description: 'LDAP account.',
        type: 'ldap'
    }, {
        title: 'Login-gov',
        description: 'Login-gov account.',
        type: 'login-gov'
    }, {
        title: 'SAML',
        description: 'SAML account.',
        type: 'saml'
    }];

    strategy: Strategy;

    constructor() { 
        this.breadcrumbs.push({ title: 'New' })
    }

    ngOnInit() {
        this.strategy = {
            state: StrategyState.New,
            enabled: false,
            name: '',
            type: '',
            settings: {
                usersReqAdmin: {
                    enabled: true
                },
                devicesReqAdmin: {
                    enabled: true
                }
            }
        }
    }
}