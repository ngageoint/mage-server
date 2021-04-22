import { Component, OnInit, Input } from '@angular/core';
import { AdminChoice, MaxLock, Strategy } from '../admin-settings.model';

@Component({
    selector: 'authentication-settings',
    templateUrl: 'authentication-settings.component.html',
    styleUrls: ['./authentication-settings.component.scss']
})
export class AuthenticationSettingsComponent implements OnInit {
    @Input() strategy: Strategy;
    @Input() teams: any[] = [];
    @Input() events: any[] = [];

    readonly usersReqAdminChoices: AdminChoice[] = [{
        title: 'Enabled',
        description: 'New user accounts require admin approval.',
        value: true
    }, {
        title: 'Disabled',
        description: 'New user accounts do not require admin approval.',
        value: false
    }];
    readonly devicesReqAdminChoices: AdminChoice[] = [{
        title: 'Enabled',
        description: 'New devices require admin approval.',
        value: true
    }, {
        title: 'Disabled',
        description: 'New devices do not require admin approval.',
        value: false
    }];
    readonly accountLockChoices: AdminChoice[] = [{
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
    readonly maxLockChoices: AdminChoice[] = [{
        title: 'Off',
        description: 'Do not disable MAGE user accounts.',
        value: false
    }, {
        title: 'On',
        description: 'Disable MAGE user accounts after account has been locked defined number of times.',
        value: true
    }];

    ngOnInit(): void {
        if (this.strategy.type === 'local') {
            this.maxLock.enabled = this.strategy.settings.accountLock && this.strategy.settings.accountLock.max !== undefined;
        }
    }
}