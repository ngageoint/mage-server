import { Component, Input } from '@angular/core';
import { AdminChoice, Strategy } from '../admin-settings.model';

@Component({
    selector: 'authentication-settings',
    templateUrl: 'authentication-settings.component.html',
    styleUrls: ['./authentication-settings.component.scss']
})
export class AuthenticationSettingsComponent {
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

    setDirty(): void {
        this.strategy.isDirty = true;
    }

    userReqAdminChanged(): void {
        if (this.strategy.settings.usersReqAdmin.enabled) {
            this.strategy.settings.newUserEvents = [];
            this.strategy.settings.newUserTeams = [];
        }
    }
}