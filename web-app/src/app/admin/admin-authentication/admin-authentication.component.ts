import _ from 'underscore'
import { Component, OnInit, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Strategy } from '../admin-authentication/admin-settings.model';
import { MatDialog } from '@angular/material/dialog';
import { StateService } from '@uirouter/angular';
import { AuthenticationDeleteComponent } from './admin-authentication-delete/admin-authentication-delete.component';
import { LocalStorageService } from '../../http/local-storage.service';
import { UserService } from '../../user/user.service';
import { EventService } from '../../event/event.service';
import { firstValueFrom } from 'rxjs';
import { TeamService } from '../../user/team.service';
import { AdminAuthenticationService } from './admin-authentication.service';

@Component({
  selector: 'admin-authentication',
  templateUrl: 'admin-authentication.component.html',
  styleUrls: ['./admin-authentication.component.scss']
})
export class AdminAuthenticationComponent implements OnInit, OnChanges {
  @Output() saveComplete = new EventEmitter<boolean>();
  @Output() deleteComplete = new EventEmitter<boolean>();
  @Output() onDirty = new EventEmitter<boolean>();
  @Input() beginSave: any;

  teams: any[] = [];
  events: any[] = [];

  strategies: Strategy[] = [];

  readonly hasAuthConfigEditPermission: boolean;

  constructor(
    private dialog: MatDialog,
    private stateService: StateService,
    public teamService: TeamService,
    public eventService: EventService,
    public localStorageService: LocalStorageService,
    private authenticationConfigurationService: AdminAuthenticationService,
    private userService: UserService) {
    this.hasAuthConfigEditPermission = _.contains(this.userService.myself.role.permissions, 'UPDATE_AUTH_CONFIG')
  }

  ngOnInit(): void {
    const configsPromise = firstValueFrom(this.authenticationConfigurationService.getAllConfigurations({ includeDisabled: true }))
    const teamsPromise = firstValueFrom(this.teamService.getTeams({ state: 'all', populate: false }))
    const eventsPromise = firstValueFrom(this.eventService.query({ state: 'all', populate: false }))

    Promise.all([configsPromise, teamsPromise, eventsPromise]).then(result => {
      // Remove event teams
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
        strategy.icon = 'data:image/png;base64,' + strategy.icon;
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
        promises.push(firstValueFrom(this.authenticationConfigurationService.updateConfiguration(strategy)));
      }
    });

    if (promises.length > 0) {
      Promise.all(promises).then(() => {
        return this.authenticationConfigurationService.getAllConfigurations({ includeDisabled: true });
      }).then((strategies: any) => {
        this.processUnsortedStrategies(strategies.data);
        this.saveComplete.emit(true);
      }).catch(err => {
        console.log(err);
        this.authenticationConfigurationService.getAllConfigurations({ includeDisabled: true }).subscribe({
          next: (newStrategies: { data: Strategy[]; }) => {
            this.processUnsortedStrategies(newStrategies.data);
            this.saveComplete.emit(false);
          },
          error: (err2: any) => {
            console.log(err2);
            this.saveComplete.emit(false);
          }
        })
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
        this.authenticationConfigurationService.getAllConfigurations({ includeDisabled: true }).subscribe({
          next: (newStrategies: { data: Strategy[]; }) => {
            this.processUnsortedStrategies(newStrategies.data);
            this.saveComplete.emit(false);
          },
          error: (err: any) => {
            console.log(err);
            this.saveComplete.emit(false);
          }
        })
      } else if (result === 'error') {
        this.deleteComplete.emit(false);
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
