import { Component, OnInit, Inject } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { ColorEvent } from 'src/app/color-picker/color-picker.component';
import { Settings, Team, Event, LocalStorageService, AuthenticationConfigurationService } from '../../upgrade/ajs-upgraded-providers';
import { Banner, Disclaimer } from './admin-settings.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AuthenticationDeleteComponent } from './authentication-delete/authentication-delete.component';
import { AuthenticationCreateComponent } from './admin-settings';

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
    deletedStrategies: any[] = [];
    newStrategies: any[] = [];
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
        private dialog: MatDialog,
        private _snackBar: MatSnackBar,
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
        this.settings.update({ type: 'banner' }, this.banner, () => {
            this._snackBar.open('Banner successfully saved', null, {
                duration: 2000,
            });
        }, () => {
            this._snackBar.open('Failed to save banner', null, {
                duration: 2000,
            });
        });
    }

    saveDisclaimer(): void {
        this.settings.update({ type: 'disclaimer' }, this.disclaimer, () => {
            this._snackBar.open('Disclaimer successfully saved', null, {
                duration: 2000,
            });
        }, () => {
            this._snackBar.open('Failed to save diclaimer', null, {
                duration: 2000,
            });
        });
    }

    saveSecurity(): void {
        //TODO save deleted and new strategies

        const promises = [];
        this.strategies.forEach(strategy => {
            if (strategy.settings.usersReqAdmin.enabled) {
                strategy.newUserEvents = [];
                strategy.newUserTeams = [];
            }
            if (strategy.type === 'local') {
                //TODO figure this out since its in a child page
                //if (!this.maxLock.enabled) {
                //    delete strategy.settings.accountLock.max;
                //}
            }
            promises.push(this.authenticationConfigurationService.updateConfiguration(strategy));
        });

        Promise.all(promises).then(() => {
            this._snackBar.open('Security successfully saved', null, {
                duration: 2000,
            });
        }).catch(err => {
            this._snackBar.open('Failed to save security', null, {
                duration: 2000,
            });
        });
    }

    colorChanged(event: ColorEvent, key: string): void {
        if (this.banner.hasOwnProperty(key)) {
            this.banner[key] = event.color;
        } else {
            console.log(key + ' is not a valid banner property');
        }
    }

    deleteStrategy(strategy: any): void {
        this.dialog.open(AuthenticationDeleteComponent, {
            width: '500px',
            data: strategy,
            autoFocus: false
        }).afterClosed().subscribe(result => {
            if (result === 'delete') {
                this.deletedStrategies.push(strategy);
                const index = this.strategies.indexOf(strategy);
                if (index > -1) {
                    this.strategies.splice(index, 1);
                }
            }
        });
    }

    createStrategy(): void {
        const strategy = {
            name: '',
            type: ''
        }
        this.dialog.open(AuthenticationCreateComponent, {
            width: '500px',
            data: strategy,
            autoFocus: false
        }).afterClosed().subscribe(result => {
            if (result === 'create') {
                this.newStrategies.push(strategy);
                const index = this.strategies.indexOf(strategy);
                if (index > -1) {
                    this.strategies.splice(index, 1);
                }
            }
        });
    }
}