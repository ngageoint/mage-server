import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Strategy, AdminChoice } from '../admin-authentication/admin-settings.model';

@Component({
    selector: 'admin-authentication-settings',
    templateUrl: 'admin-authentication-settings.component.html',
    styleUrls: ['./admin-authentication-settings.component.scss']
})
export class AdminAuthenticationSettingsComponent {
    @Input() strategy: Strategy;
    @Input() teams: any[] = [];
    @Input() events: any[] = [];
    @Output() strategyDirty = new EventEmitter<boolean>();

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

    /**
     * Set locally
     * @param isDirty 
     */
    setDirty(isDirty: boolean): void {
        if (!this.strategy) return;
        this.strategy.isDirty = isDirty;
        this.onStrategyDirty(isDirty);
      }      

    /**
     * Called by children
     * @param isDirty 
     */
    onStrategyDirty(isDirty: boolean): void {
        this.strategyDirty.emit(isDirty);
    }

    userReqAdminChanged(): void {
        const settings = this.strategy?.settings;
        if (!settings) return;
      
        if (settings.usersReqAdmin?.enabled) {
          settings.newUserEvents = [];
          settings.newUserTeams = [];
        }
      }
      
}