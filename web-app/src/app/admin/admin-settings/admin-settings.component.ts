import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { ColorEvent } from 'src/app/color-picker/color-picker.component';
import { Settings, Team, Event, LocalStorageService, AuthenticationConfigurationService } from '../../upgrade/ajs-upgraded-providers';
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
    events: any[] = [];
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
    disclaimer: any;

    constructor(
        @Inject(Settings)
        public settings: any,
        @Inject(Team)
        public team: any,
        @Inject(Event)
        public event: any,
        @Inject(LocalStorageService)
        public localStorageService: any,
        @Inject(AuthenticationConfigurationService)
        public authenticationConfigurationService: any) {
        this.token = localStorageService.getToken();
    }

    ngOnInit(): void {
        const configsPromise = this.authenticationConfigurationService.getAllConfigurations()
        const settingsPromise = this.settings.query().$promise;
        const teamsPromise = this.team.query({ state: 'all', populate: false }).$promise;
        const eventsPromise = this.event.query({ state: 'all', populate: false }).$promise;

        Promise.all([configsPromise, settingsPromise, teamsPromise, eventsPromise]).then(result => {
            this.teams = result[2].filter(function (team: any): boolean {
                return team.teamEventId !== undefined;
            });
            this.events = result[3];

            this.strategies = result[0] || [];
            this.strategies.sort(function (a: any, b: any): number {
                const nameA = a.name.toUpperCase(); // ignore upper and lowercase
                const nameB = b.name.toUpperCase(); // ignore upper and lowercase
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }

                // names must be equal
                return 0;
            });
            this.pill = Object.keys(this.strategies).length ? 'security' : 'banner';

            const settings: any = {};

            if (result[1].length > 0) {
                result[1].forEach(element => {
                    settings[element.type] = {};
                    Object.keys(element).forEach(key => {
                        if (key !== 'type') {
                            settings[element.type][key] = element[key];
                        }
                    });
                });
            }

            this.banner = settings.banner ? settings.banner.settings : this.banner;
            this.disclaimer = settings.disclaimer ? settings.disclaimer.settings : this.disclaimer;

            this.strategies.forEach(strategy => {
                if (strategy.settings.newUserEvents) {
                    strategy.settings.newUserEvents = strategy.settings.newUserEvents.filter(id => {
                        return this.events.some(event => event.id === id)
                    });
                }
                if (strategy.settings.newUserTeams) {
                    // Remove any teams and events that no longer exist
                    strategy.settings.newUserTeams = strategy.settings.newUserTeams.filter(id => {
                        return this.teams.some(team => team.id === id)
                    });
                }
                if (strategy.settings.passwordPolicy) {
                    this.buildPasswordHelp(strategy);
                    if (strategy.type === 'local') {
                        this.maxLock.enabled = strategy.settings.accountLock && strategy.settings.accountLock.max !== undefined;
                    }
                }
            });
        }).catch(err => {
            console.log(err);
        })
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