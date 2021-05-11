import _ from 'underscore'
import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { Settings, Team, Event, LocalStorageService, AuthenticationConfigurationService, UserService } from '../../upgrade/ajs-upgraded-providers';
import { Disclaimer, Strategy, StrategyState } from './admin-settings.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AuthenticationDeleteComponent } from './authentication-delete/authentication-delete.component';
import { AuthenticationCreateComponent } from './admin-settings';
import { FormControl } from '@angular/forms';
import { SecurityBannerComponent } from './security-banner/security-banner.component';

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
    @ViewChild(SecurityBannerComponent) securityBannerView: SecurityBannerComponent;
    token: any;
    selected = new FormControl(0);
    teams: any[] = [];
    events: any[] = [];

    strategies: Strategy[] = [];
    disclaimer: Disclaimer = {
        showDisclaimer: false,
        disclaimerTitle: '',
        disclaimerText: ''
    }

    hasAuthConfigEditPermission: boolean;

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
        public authenticationConfigurationService: any,
        @Inject(UserService)
        userService: { myself: { role: { permissions: Array<string> } } }) {

        this.token = localStorageService.getToken();
        this.hasAuthConfigEditPermission = _.contains(userService.myself.role.permissions, 'UPDATE_AUTH_CONFIG');
    }

    ngOnInit(): void {
        const configsPromise = this.authenticationConfigurationService.getAllConfigurations();
        const settingsPromise = this.settings.query().$promise;
        const teamsPromise = this.team.query({ state: 'all', populate: false }).$promise;
        const eventsPromise = this.event.query({ state: 'all', populate: false }).$promise;

        Promise.all([configsPromise, settingsPromise, teamsPromise, eventsPromise]).then(result => {
            //Remove event teams
            this.teams = result[2].filter(function (team: any): boolean {
                return team.teamEventId === undefined;
            });
            this.events = result[3];

            this.strategies = result[0] ? result[0].data : [];
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

    save(): void {
        if (this.selected.value === 1) {
            this.securityBannerView.save();
        } else if (this.selected.value === 2) {
            this.saveDisclaimer();
        } else {
            this.saveAuthentication();
        }
    }

    onBannerSaved(status: boolean): void {
        if (status) {
            this._snackBar.open('Banner successfully saved', null, {
                duration: 2000,
            });
        } else {
            this._snackBar.open('Failed to save banner', null, {
                duration: 2000,
            });
        };
    }

    private saveDisclaimer(): void {
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

    private saveAuthentication(): void {
        const promises = [];
        this.strategies.forEach(strategy => {
            if (strategy.settings.usersReqAdmin.enabled) {
                strategy.settings.newUserEvents = [];
                strategy.settings.newUserTeams = [];
            }
            if (strategy.type === 'local') {
                //TODO figure this out since its in a child page
                //if (!this.maxLock.enabled) {
                //    delete strategy.settings.accountLock.max;
                //}
            }
            if (strategy.state === undefined) {
                promises.push(this.authenticationConfigurationService.updateConfiguration(strategy));
            } else if (strategy.state === StrategyState.New) {
                promises.push(this.authenticationConfigurationService.createConfiguration(strategy));
            } else {
                promises.push(this.authenticationConfigurationService.deleteConfiguration(strategy));
            }
        });

        Promise.all(promises).then(() => {
            return this.authenticationConfigurationService.getAllConfigurations();
        }).then(strategies => {
            this.strategies = strategies.data;
            this._snackBar.open('Authentication successfully saved', null, {
                duration: 2000,
            });
        }).catch(err => {
            console.log(err);
            this._snackBar.open('Failed to save authentication', null, {
                duration: 2000,
            });
        });
    }

    deleteStrategy(strategy: any): void {
        this.dialog.open(AuthenticationDeleteComponent, {
            width: '500px',
            data: strategy,
            autoFocus: false
        }).afterClosed().subscribe(result => {
            if (result === 'delete') {
                strategy.state = StrategyState.Removed;

                if (strategy._id == null) {
                    strategy.state = StrategyState.New;
                    const idx = this.strategies.indexOf(strategy);
                    if (idx > -1) {
                        this.strategies.splice(idx, 1);
                    }
                }
            }
        });
    }

    createStrategy(): void {
        const strategy = {
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
        this.dialog.open(AuthenticationCreateComponent, {
            width: '500px',
            data: strategy,
            autoFocus: false
        }).afterClosed().subscribe(result => {
            if (result === 'create') {
                this.strategies.push(strategy);
            }
        });
    }
}