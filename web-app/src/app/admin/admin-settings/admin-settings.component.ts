import _ from 'underscore'
import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { Team, Event, LocalStorageService, AuthenticationConfigurationService, UserService } from '../../upgrade/ajs-upgraded-providers';
import { Strategy } from './admin-settings.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AuthenticationDeleteComponent, SecurityDisclaimerComponent, SecurityBannerComponent, ContactInfoComponent } from './admin-settings';
import { FormControl } from '@angular/forms';
import { StateService } from '@uirouter/angular'

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
    @ViewChild(SecurityDisclaimerComponent) securityDisclaimerView: SecurityDisclaimerComponent;
    @ViewChild(ContactInfoComponent) contactInfoView: ContactInfoComponent;
    token: any;
    selectedTab = new FormControl(0);
    teams: any[] = [];
    events: any[] = [];

    strategies: Strategy[] = [];

    hasAuthConfigEditPermission: boolean;

    constructor(
        private dialog: MatDialog,
        private _snackBar: MatSnackBar,
        private stateService: StateService,
        @Inject(Team)
        public team: any,
        @Inject(Event)
        public event: any,
        @Inject(LocalStorageService)
        public localStorageService: any,
        @Inject(AuthenticationConfigurationService)
        private authenticationConfigurationService: any,
        @Inject(UserService)
        private userService: { myself: { role: { permissions: Array<string> } } }) {

        this.token = localStorageService.getToken();
        this.hasAuthConfigEditPermission = _.contains(this.userService.myself.role.permissions, 'UPDATE_AUTH_CONFIG');
    }

    ngOnInit(): void {
        const configsPromise = this.authenticationConfigurationService.getAllConfigurations({ includeDisabled: true });
        const teamsPromise = this.team.query({ state: 'all', populate: false }).$promise;
        const eventsPromise = this.event.query({ state: 'all', populate: false }).$promise;

        Promise.all([configsPromise, teamsPromise, eventsPromise]).then(result => {
            //Remove event teams
            this.teams = result[1].filter(function (team: any): boolean {
                return team.teamEventId === undefined;
            });
            this.events = result[2];

            const unsortedStrategies = result[0] ? result[0].data : [];
            this.processUnsortedStrategies(unsortedStrategies);
        }).catch(err => {
            console.log(err);
        });
    }

    private processUnsortedStrategies(unsortedStrategies: Strategy[]): void {
        this.strategies = _.sortBy(unsortedStrategies, 'title');

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
            if (strategy.icon) {
                strategy.icon = "data:image/png;base64," + strategy.icon;
            }
        });
    }

    save(): void {
        if (this.selectedTab.value === 1) {
            this.securityBannerView.save();
        } else if (this.selectedTab.value === 2) {
            this.securityDisclaimerView.save();
        } else if (this.selectedTab.value === 3) {
            this.contactInfoView.save();
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

    onDisclaimerSaved(status: boolean): void {
        if (status) {
            this._snackBar.open('Disclaimer successfully saved', null, {
                duration: 2000,
            });
        } else {
            this._snackBar.open('Failed to save disclaimer', null, {
                duration: 2000,
            });
        };
    }

    onContactInfoSaved(status: boolean): void {
        if (status) {
            this._snackBar.open('Contact info successfully saved', null, {
                duration: 2000,
            });
        } else {
            this._snackBar.open('Failed to save contact info', null, {
                duration: 2000,
            });
        };
    }

    private saveAuthentication(): void {
        const promises = [];
        this.strategies.forEach(strategy => {
            if (strategy.isDirty) {
                promises.push(this.authenticationConfigurationService.updateConfiguration(strategy));
            }
        });

        if (promises.length > 0) {
            Promise.all(promises).then(() => {
                return this.authenticationConfigurationService.getAllConfigurations({ includeDisabled: true });
            }).then(strategies => {
                this.processUnsortedStrategies(strategies.data);
                this._snackBar.open('Authentication successfully saved', null, {
                    duration: 2000,
                });
            }).catch(err => {
                console.log(err);
                this._snackBar.open('Failed to save authentication', null, {
                    duration: 2000,
                });
            });
        } else {
            this._snackBar.open('No authentication changes to be saved', null, {
                duration: 2000,
            });
        }

    }

    deleteStrategy(strategy: Strategy): void {
        this.dialog.open(AuthenticationDeleteComponent, {
            width: '500px',
            data: strategy,
            autoFocus: false
        }).afterClosed().subscribe(result => {
            if (result === 'delete') {
                this.authenticationConfigurationService.getAllConfigurations().then(configs => {
                    this.processUnsortedStrategies(configs.data);
                }).catch(err => {
                    console.error(err);
                })
            }
        });
    }

    createAuthentication(): void {
        this.stateService.go('admin.authenticationCreate')
    }
}