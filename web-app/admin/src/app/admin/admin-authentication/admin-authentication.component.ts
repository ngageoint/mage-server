import _ from 'underscore'
import { Component, OnInit, Inject, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Team, Event, LocalStorageService, AuthenticationConfigurationService, UserService } from '../../upgrade/ajs-upgraded-providers';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { Strategy } from '../admin-authentication/admin-settings.model';
import { MatDialog } from '@angular/material/dialog';
import { StateService } from '@uirouter/angular';
import { AuthenticationDeleteComponent } from './admin-authentication-delete/admin-authentication-delete.component';
import { AdminSettingsUnsavedComponent } from '../admin-settings/admin-settings-unsaved/admin-settings-unsaved.component';
import { TransitionService } from '@uirouter/core';
import { lastValueFrom } from 'rxjs';

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

  readonly breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Security',
    icon: 'shield'
  }];

  teams: any[] = [];
  events: any[] = [];

  isDirty: boolean = false;

  strategies: Strategy[] = [];

  readonly hasAuthConfigEditPermission: boolean;

  constructor(
    private dialog: MatDialog,
    private stateService: StateService,
    private readonly snackBar: MatSnackBar,
    private readonly transitionService: TransitionService,
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
    this.transitionService.onExit({}, this.onUnsavedChanges, { bind: this });

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

  onAuthenticationSaved(status: boolean): void {
    if (status) {
      this.snackBar.open('Authentication successfully saved', null, {
        duration: 2000,
      });
    } else {
      this.snackBar.open('1 or more authentications failed to save correctly', null, {
        duration: 2000,
      });
    };
    this.isDirty = false;
  }

  onAuthenticationDeleted(status: boolean): void {
    if (status) {
      this.snackBar.open('Authentication successfully deleted', null, {
        duration: 2000,
      });
    } else {
      this.snackBar.open('Failed to delete authentication', null, {
        duration: 2000,
      });
    };
    this.isDirty = false;
  }

  save(): void {
    console.log('Saving authentication configurations');
    const promises = [];
    this.strategies.forEach(strategy => {
      if (strategy.isDirty) {
        promises.push(this.authenticationConfigurationService.updateConfiguration(strategy));
      }
    });

    Promise.all(promises).then(() => {
      return this.authenticationConfigurationService.getAllConfigurations({ includeDisabled: true });
    }).then(strategies => {
      this.processUnsortedStrategies(strategies.data);
      this.onAuthenticationSaved(true);
    }).catch(err => {
      console.log(err);
      this.authenticationConfigurationService.getAllConfigurations({ includeDisabled: true }).then((newStrategies: { data: Strategy[]; }) => {
        this.processUnsortedStrategies(newStrategies.data);
        this.onAuthenticationSaved(false);
      }).catch((err2: any) => {
        console.log(err2);
        this.onAuthenticationSaved(false);
      });
    });
    this.isDirty = false;
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
          this.onAuthenticationDeleted(true);
        }).catch((err: any) => {
          console.error(err);
          this.onAuthenticationDeleted(false);
        });
      } else if (result === 'error') {
        this.onAuthenticationDeleted(false);
      }
    });
  }

  createAuthentication(): void {
    this.stateService.go('admin.authenticationCreate')
  }

  onAuthenticationToggled(strategy: Strategy): void {
    strategy.isDirty = true;
    this.isDirty = true;
  }

  async onUnsavedChanges(): Promise<boolean> {
    if (this.isDirty) {
      const ref = this.dialog.open(AdminSettingsUnsavedComponent);

      const result_2 = await lastValueFrom(ref.afterClosed());
      let discard = true;
      if (result_2) {
        discard = result_2.discard;
      }
      if (discard) {
        this.isDirty = false;
      }
      return await Promise.resolve(discard);
    }

    return Promise.resolve(true);
  }
}
