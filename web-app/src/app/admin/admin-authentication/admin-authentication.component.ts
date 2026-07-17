import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../admin-breadcrumb/admin-breadcrumb.service';
import { Strategy } from '../admin-authentication/admin-settings.model';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { AuthenticationDeleteComponent } from './admin-authentication-delete/admin-authentication-delete.component';
import { AdminSettingsUnsavedComponent } from '../admin-settings/admin-settings-unsaved/admin-settings-unsaved.component';
import { lastValueFrom, Subject, takeUntil } from 'rxjs';
import { AuthenticationConfigurationService } from '../services/admin-authentication-configuration.service';
import { AdminTeamsService } from '../services/admin-teams-service';
import { AdminEventsService } from '../services/admin-events.service';
import { SessionService } from 'mage-web-app/http/session.service';

export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Promise<boolean>;
}

@Component({
    selector: 'admin-authentication',
    templateUrl: 'admin-authentication.component.html',
    styleUrls: ['./admin-authentication.component.scss'],
    standalone: false
})
export class AdminAuthenticationComponent
  implements OnInit, OnDestroy, CanComponentDeactivate
{
  readonly breadcrumbs: AdminBreadcrumb[] = [{ title: 'Authentication', icon: 'lock' }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  teams: any[] = [];
  events: any[] = [];

  isDirty = false;

  strategies: Strategy[] = [];

  hasAuthConfigEditPermission = false;

  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private teamsService: AdminTeamsService,
    private eventsService: AdminEventsService,
    private authenticationConfigurationService: AuthenticationConfigurationService,
    private sessionService: SessionService,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.sessionService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.hasAuthConfigEditPermission =
          user?.role?.permissions?.includes('UPDATE_AUTH_CONFIG') || false;
      });

    this.loadInitialData().catch((err) => {
      console.log(err);
    });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadInitialData(): Promise<void> {
    const configsPromise = lastValueFrom(
      this.authenticationConfigurationService.getAllConfigurations({
        includeDisabled: true
      })
    );

    const teamsPromise = lastValueFrom(
      this.teamsService.getTeams({
        state: 'all',
        populate: false
      } as any)
    );

    const eventsPromise = lastValueFrom(
      this.eventsService.getEvents({
        state: 'all',
        populate: false
      } as any)
    );

    const [configs, teamsResult, eventsResult] = await Promise.all([
      configsPromise,
      teamsPromise,
      eventsPromise
    ]);

    const teamsArray = Array.isArray(teamsResult)
      ? teamsResult
      : teamsResult?.items || [];

    const eventsArray = Array.isArray(eventsResult)
      ? eventsResult
      : eventsResult?.items || [];

    this.teams = (teamsArray || []).filter(
      (team: any) => team.teamEventId === undefined
    );
    this.events = eventsArray || [];

    const unsortedStrategies: Strategy[] =
      (configs as any)?.data || (configs as any) || [];
    this.processUnsortedStrategies(unsortedStrategies);
  }

  private processUnsortedStrategies(unsortedStrategies: Strategy[]): void {
    this.strategies = (unsortedStrategies || [])
      .slice()
      .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));

    this.strategies.forEach((strategy) => {
      if (strategy.settings?.newUserEvents) {
        strategy.settings.newUserEvents =
          strategy.settings.newUserEvents.filter((id: any) =>
            this.events.some((event) => event.id === id)
          );
      }

      if (strategy.settings?.newUserTeams) {
        strategy.settings.newUserTeams = strategy.settings.newUserTeams.filter(
          (id: any) => this.teams.some((team) => team.id === id)
        );
      }

      if (strategy.icon) {
        strategy.icon = 'data:image/png;base64,' + strategy.icon;
      }
    });
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
    this.isDirty = false;
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
    this.isDirty = false;
  }

  async save(): Promise<void> {
    try {
      const dirty = this.strategies.filter((s) => (s as any).isDirty);
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
      console.log(err);

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
        console.log(err2);
      }

      this.onAuthenticationSaved(false);
    } finally {
      this.isDirty = false;
    }
  }

  deleteStrategy(strategy: Strategy): void {
    this.dialog
      .open(AuthenticationDeleteComponent, {
        width: '500px',
        data: strategy,
        autoFocus: false
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
    (strategy as any).isDirty = true;
    this.isDirty = true;
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.onUnsavedChanges();
  }

  async onUnsavedChanges(): Promise<boolean> {
    if (this.isDirty) {
      const ref = this.dialog.open(AdminSettingsUnsavedComponent);
      const result = await lastValueFrom(ref.afterClosed());

      let discard = true;
      if (result) {
        discard = result.discard;
      }
      if (discard) {
        this.isDirty = false;
      }
      return discard;
    }

    return true;
  }
}
