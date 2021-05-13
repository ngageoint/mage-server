import _ from 'underscore'
import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { Team, Event, LocalStorageService, AuthenticationConfigurationService, UserService } from '../../upgrade/ajs-upgraded-providers';
import { Strategy } from './admin-settings.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AuthenticationDeleteComponent, SecurityDisclaimerComponent, SecurityBannerComponent } from './admin-settings';
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
        const configsPromise = this.authenticationConfigurationService.getAllConfigurations();
        const teamsPromise = this.team.query({ state: 'all', populate: false }).$promise;
        const eventsPromise = this.event.query({ state: 'all', populate: false }).$promise;

        Promise.all([configsPromise, teamsPromise, eventsPromise]).then(result => {
            //Remove event teams
            this.teams = result[1].filter(function (team: any): boolean {
                return team.teamEventId === undefined;
            });
            this.events = result[2];

            const unsortedStrategies = result[0] ? result[0].data : [];
            this.strategies = _.sortBy(unsortedStrategies, 'name');

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
        if (this.selectedTab.value === 1) {
            this.securityBannerView.save();
        } else if (this.selectedTab.value === 2) {
            this.securityDisclaimerView.save();
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

    private saveAuthentication(): void {
        const promises = [];
        this.strategies.forEach(strategy => {
            if (strategy.settings.usersReqAdmin.enabled) {
                strategy.settings.newUserEvents = [];
                strategy.settings.newUserTeams = [];
            }

            if (strategy.isDirty) {
                promises.push(this.authenticationConfigurationService.updateConfiguration(strategy));
            }
        });

        if (promises.length > 0) {
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
        } else {
            this._snackBar.open('No authentication changes to be saved', null, {
                duration: 2000,
            });
        }

    }

    deleteStrategy(strategy: any): void {
        this.dialog.open(AuthenticationDeleteComponent, {
            width: '500px',
            data: strategy,
            autoFocus: false
        }).afterClosed().subscribe(result => {
            if (result === 'delete') {
                //TODO
                this.ngOnInit();
            }
        });
    }

    createAuthentication(): void {
        this.stateService.go('admin.authenticationCreate')
    }
}