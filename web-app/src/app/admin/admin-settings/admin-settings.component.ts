import { Component, OnInit, Inject } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { ColorEvent } from 'src/app/color-picker/color-picker.component';
import { Settings, Team, Event, LocalStorageService, AuthenticationConfigurationService } from '../../upgrade/ajs-upgraded-providers';
import { Banner, Disclaimer } from './admin-settings.model';

@Component({
    selector: 'admin-settings',
    templateUrl: 'admin-settings.component.html',
    styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit {
    breadcrumbs: AdminBreadcrumb[] = [{
        title: 'Settings',
        icon: 'build'
    }];
    token: any;
    pill: string = 'security';
    teams: any[] = [];
    events: any[] = [];
    strategies: any[] = [];
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
    disclaimer: Disclaimer = {
        showDisclaimer: false,
        disclaimerTitle: '',
        disclaimerText: ''
    }

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
            //Remove event teams
            this.teams = result[2].filter(function (team: any): boolean {
                return team.teamEventId === undefined;
            });
            this.events = result[3];

            this.strategies = result[0] || [];
            this.strategies.sort(function (a: any, b: any): number {
                const nameA = a.name.toUpperCase(); 
                const nameB = b.name.toUpperCase();
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }

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
            });
        }).catch(err => {
            console.log(err);
        });
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