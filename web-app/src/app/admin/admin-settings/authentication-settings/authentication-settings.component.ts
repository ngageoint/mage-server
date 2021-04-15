import { Component, OnInit, Input, Inject } from '@angular/core';
import { AdminChoice, MaxLock } from '../admin-settings.model';
import { Team } from 'src/app/upgrade/ajs-upgraded-providers';

@Component({
    selector: 'authentication-settings',
    templateUrl: 'authentication-settings.component.html',
    styleUrls: ['./authentication-settings.component.scss']
})
export class AuthenticationSettingsComponent implements OnInit {
    @Input() strategy: any;
    @Input() teams: any[] = [];
    @Input() events: any[] = [];
    
    usersReqAdminChoices: AdminChoice[] = [{
        title: 'Enabled',
        description: 'New user accounts require admin approval.',
        value: true
    }, {
        title: 'Disabled',
        description: 'New user accounts do not require admin approval.',
        value: false
    }];
    devicesReqAdminChoices: AdminChoice[] = [{
        title: 'Enabled',
        description: 'New devices require admin approval.',
        value: true
    }, {
        title: 'Disabled',
        description: 'New devices do not require admin approval.',
        value: false
    }];
    accountLock: any = {};
    accountLockChoices: AdminChoice[] = [{
        title: 'Off',
        description: 'Do not lock MAGE user accounts.',
        value: false
    }, {
        title: 'On',
        description: 'Lock MAGE user accounts for defined time \n after defined number of invalid login attempts.',
        value: true
    }];
    maxLock: MaxLock = {
        enabled: false
    };
    maxLockChoices: AdminChoice[] = [{
        title: 'Off',
        description: 'Do not disable MAGE user accounts.',
        value: false
    }, {
        title: 'On',
        description: 'Disable MAGE user accounts after account has been locked defined number of times.',
        value: true
    }];

    ngOnInit(): void {

        if (this.strategy.settings.passwordPolicy) {
            this.buildPasswordHelp(this.strategy);
            if (this.strategy.type === 'local') {
                this.maxLock.enabled = this.strategy.settings.accountLock && this.strategy.settings.accountLock.max !== undefined;
            }
        }
    }

    buildPasswordHelp(strategy): void {
        if (strategy.settings.passwordPolicy) {
            if (!strategy.settings.passwordPolicy.customizeHelpText) {
                const policy = strategy.settings.passwordPolicy
                const templates = Object.entries(policy.helpTextTemplate)
                    .filter(([key]) => policy[`${key}Enabled`] === true)
                    .map(([key, value]) => {
                        return (value as string).replace('#', policy[key])
                    });

                strategy.settings.passwordPolicy.helpText = `Password is invalid, must ${templates.join(' and ')}.`;
            }
        }
    }
}