import { Component, DestroyRef, OnInit, OnDestroy, TemplateRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../admin-breadcrumb/admin-breadcrumb.service';
import { Strategy } from '../admin-authentication/admin-settings.model';
import { MatDialog } from '@angular/material/dialog';
import { AuthenticationDeleteComponent } from './admin-authentication-delete/admin-authentication-delete.component';
import { AdminSettingsUnsavedComponent } from '../admin-settings/admin-settings-unsaved/admin-settings-unsaved.component';
import { AdminAuthenticationSettingsComponent } from './admin-authentication-settings.component';
import { forkJoin, lastValueFrom } from 'rxjs';
import { AuthenticationConfigurationService } from '../services/admin-authentication-configuration.service';
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { AdminEventsService } from '../services/admin-events.service';
import { SessionService } from 'mage-web-app/http/session.service';

export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Promise<boolean>;
}

@Component({
    selector: 'admin-authentication',
    templateUrl: 'admin-authentication.component.html',
    styleUrls: ['./admin-authentication.component.scss'],
    imports: [
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatExpansionModule,
        FormsModule,
        MatSlideToggleModule,
        AdminAuthenticationSettingsComponent
    ]
})
export class AdminAuthenticationComponent
  implements OnInit, OnDestroy, CanComponentDeactivate
{
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly teamsService: TeamService = inject(TeamService);
  private readonly eventsService: AdminEventsService = inject(AdminEventsService);
  private readonly authenticationConfigurationService: AuthenticationConfigurationService = inject(AuthenticationConfigurationService);
  private readonly sessionService: SessionService = inject(SessionService);
  private readonly breadcrumbService: AdminBreadcrumbService = inject(AdminBreadcrumbService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly breadcrumbs: AdminBreadcrumb[] = [{ title: 'Authentication', icon: 'lock' }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  readonly teams = signal<Team[]>([]);
  readonly events = signal<any[]>([]);

  readonly isDirty = signal(false);

  readonly strategies = signal<Strategy[]>([]);

  get hasAuthConfigEditPermission(): boolean {
    return this.sessionService.hasPermission('UPDATE_AUTH_CONFIG');
  }

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    forkJoin({
      configs: this.authenticationConfigurationService.getAllConfigurations({
        includeDisabled: true
      }),
      // TODO: this used to get all teams - need a team search/select component instead
      teams: this.teamsService.search({ pageSize: 9999, pageIndex: 0 }),
      events: this.eventsService.getEvents({
        state: 'all',
        populate: false
      } as any)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ configs, teams, events }) => this.loadInitialData(configs, teams, events),
        error: (err) => console.error(err)
      });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  private loadInitialData(configs: any, teamsResult: any, eventsResult: any): void {
    const teamsArray = Array.isArray(teamsResult)
      ? teamsResult
      : teamsResult?.items || [];

    const eventsArray = Array.isArray(eventsResult)
      ? eventsResult
      : eventsResult?.items || [];

    this.teams.set(teamsArray.filter(
      (team: any) => team.teamEventId === undefined
    ));
    this.events.set(eventsArray);

    const unsortedStrategies: Strategy[] =
      (configs as any)?.data || (configs as any) || [];
    this.processUnsortedStrategies(unsortedStrategies);
  }

  private processUnsortedStrategies(unsortedStrategies: Strategy[]): void {
    const strategies = (unsortedStrategies || [])
      .slice()
      .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));

    const events = this.events();
    const teams = this.teams();

    strategies.forEach((strategy) => {
      if (strategy.settings?.newUserEvents) {
        strategy.settings.newUserEvents =
          strategy.settings.newUserEvents.filter((id: any) =>
            events.some((event) => event.id === id)
          );
      }

      if (strategy.settings?.newUserTeams) {
        strategy.settings.newUserTeams = strategy.settings.newUserTeams.filter(
          (id: any) => teams.some((team) => team.id === id)
        );
      }

      if (strategy.icon) {
        strategy.icon = 'data:image/png;base64,' + strategy.icon;
      }
    });

    this.strategies.set(strategies);
  }

  onAuthenticationSaved(status: boolean): void {
    if (status) {
      this.snackBar.open('Authentication successfully saved', undefined, {
        duration: 2000
      });
    } else {
      this.snackBar.open(
        '1 or more authentications failed to save correctly',
        undefined,
        { duration: 2000 }
      );
    }
    this.isDirty.set(false);
  }

  onAuthenticationDeleted(status: boolean): void {
    if (status) {
      this.snackBar.open('Authentication successfully deleted', undefined, {
        duration: 2000
      });
    } else {
      this.snackBar.open('Failed to delete authentication', undefined, {
        duration: 2000
      });
    }
    this.isDirty.set(false);
  }

  async save(): Promise<void> {
    try {
      const dirty = this.strategies().filter((s) => s.isDirty);
      await Promise.all(
        dirty.map((strategy) =>
          lastValueFrom(
            this.authenticationConfigurationService.updateConfiguration(strategy)
          )
        )
      );

      const refreshed = await lastValueFrom(
        this.authenticationConfigurationService.getAllConfigurations({
          includeDisabled: true
        })
      );

      const strategies = (refreshed as any)?.data || (refreshed as any) || [];
      this.processUnsortedStrategies(strategies);
      this.onAuthenticationSaved(true);
    } catch (err) {
      console.error(err);

      try {
        const refreshed = await lastValueFrom(
          this.authenticationConfigurationService.getAllConfigurations({
            includeDisabled: true
          })
        );
        const strategies =
          (refreshed as any)?.data || (refreshed as any) || [];
        this.processUnsortedStrategies(strategies);
      } catch (err2) {
        console.error(err2);
      }

      this.onAuthenticationSaved(false);
    } finally {
      this.isDirty.set(false);
    }
  }

  deleteStrategy(strategy: Strategy): void {
    this.dialog
      .open(AuthenticationDeleteComponent, {
        width: '500px',
        data: strategy
      })
      .afterClosed()
      .subscribe(async (result) => {
        if (result === 'delete') {
          try {
            const refreshed = await lastValueFrom(
              this.authenticationConfigurationService.getAllConfigurations({
                includeDisabled: true
              })
            );
            const strategies =
              (refreshed as any)?.data || (refreshed as any) || [];
            this.processUnsortedStrategies(strategies);
            this.onAuthenticationDeleted(true);
          } catch (err) {
            console.error(err);
            this.onAuthenticationDeleted(false);
          }
        } else if (result === 'error') {
          this.onAuthenticationDeleted(false);
        }
      });
  }

  onAuthenticationToggled(strategy: Strategy): void {
    strategy.isDirty = true;
    this.isDirty.set(true);
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.onUnsavedChanges();
  }

  async onUnsavedChanges(): Promise<boolean> {
    if (this.isDirty()) {
      const ref = this.dialog.open(AdminSettingsUnsavedComponent);
      const result = await lastValueFrom(ref.afterClosed());

      let discard = true;
      if (result) {
        discard = result.discard;
      }
      if (discard) {
        this.isDirty.set(false);
      }
      return discard;
    }

    return true;
  }
}
