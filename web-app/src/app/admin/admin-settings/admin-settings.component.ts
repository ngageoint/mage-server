import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { ColorEvent } from 'src/app/color-picker/color-picker.component';
import { Settings, Team, Event, LocalStorageService } from '../../upgrade/ajs-upgraded-providers';
import { Banner, AdminChoice, MaxLock } from './admin-settings.model';

@Component({
    selector: 'admin-settings',
    templateUrl: 'admin-settings.component.html',
    styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit, OnDestroy {
    breadcrumbs: AdminBreadcrumb[] = [{
        title: 'Settings',
        icon: 'build'
    }];
    token: any;
    pill: string = 'security';
    teams: any[] = [];
    strategies: any[] = [];
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
    setting: string = 'banner';
    banner: Banner = {
        headerTextColor: '#000000',
        headerText: '',
        headerBackgroundColor: 'FFFFFF',
        footerTextColor: '#000000',
        footerText: '',
        footerBackgroundColor: 'FFFFFF',
        showHeader: false,
        showFooter: false
    };

    constructor(
        @Inject(Settings)
        public settings: any,
        @Inject(Team)
        public team: any,
        @Inject(Event)
        public event: any,
        @Inject(LocalStorageService)
        public localStorageService: any) {
        this.token = localStorageService.getToken();
    }

    ngOnInit(): void {
        const settingsPromise = this.settings.query().$promise;
        const teamsPromise = this.team.query({ state: 'all', populate: false }).$promise;
        const eventsPromise = this.event.query({ state: 'all', populate: false }).$promise;

        Promise.all([settingsPromise, teamsPromise, eventsPromise]).then(values => {

        }).catch(err => {
            console.log(err);
        })
    }

    ngOnDestroy(): void {
    }

    saveBanner(): void {
    }

    saveDisclaimer(): void {
    }

    saveSecurity(): void {
    }

    colorChanged(event: ColorEvent, key: string): void {

    }
}