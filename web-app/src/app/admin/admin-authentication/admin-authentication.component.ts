import _ from 'underscore'
import { Component, OnInit, Inject, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Team, Event, LocalStorageService, AuthenticationConfigurationService, UserService } from '../../upgrade/ajs-upgraded-providers';
import { Strategy } from '../admin-authentication/admin-settings.model';
import { MatDialog } from '@angular/material/dialog';
import { StateService } from '@uirouter/angular';
import { AuthenticationDeleteComponent } from './admin-authentication-delete/admin-authentication-delete.component';

@Component({
    selector: 'admin-authentication',
    templateUrl: 'admin-authentication.component.html',
    styleUrls: ['./admin-authentication.component.scss']
})
export class AdminAuthenticationComponent implements OnInit, OnChanges {
    @Output() saveComplete = new EventEmitter<boolean>();
    @Output() onDirty = new EventEmitter<boolean>();
    @Input() beginSave: any;

    teams: any[] = [];
    events: any[] = [];

    strategies: Strategy[] = [];

    hasAuthConfigEditPermission: boolean;

    constructor(
        private dialog: MatDialog,
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

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.beginSave && !changes.beginSave.firstChange) {
            this.save();
        }
    }

    private save(): void {
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
                this.saveComplete.emit(true);
            }).catch(err => {
                console.log(err);
                this.saveComplete.emit(false);
            });
        }
        this.onStrategyDirty(false);
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

    onStrategyDirty(isDirty: boolean): void {
        this.onDirty.emit(isDirty);
    }

    onAuthenticationToggled(strategy: Strategy): void {
        strategy.isDirty = true;
        this.onStrategyDirty(true)
    }
}