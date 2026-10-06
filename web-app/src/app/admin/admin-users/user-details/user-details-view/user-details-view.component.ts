import { Component, DestroyRef, EventEmitter, Input, OnInit, OnDestroy, Output, TemplateRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { UserService } from '../../../../user/user.service';
import { AdminEventsService } from '../../../services/admin-events.service';
import { DeleteUserComponent } from '../../delete-user/delete-user.component';
import { ChangePasswordComponent } from '../../change-password/change-password.component';
import { User } from '../../user';
import { userAvatarUrl, userIconUrl } from '../../../../entities/user/user';
import { AdminBreadcrumbService } from '../../../admin-breadcrumb/admin-breadcrumb.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { LoginsComponent } from '../../../admin-logins/admin-logins.component';

@Component({
    selector: 'mage-user-details-view',
    templateUrl: './user-details-view.component.html',
    styleUrls: ['./user-details-view.component.scss'],
    imports: [
      CommonModule,
      FormsModule,
      MatButtonModule,
      MatIconModule,
      MatCardModule,
      MatDividerModule,
      MatFormFieldModule,
      MatInputModule,
      MatListModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatTooltipModule,
      RouterModule,
      LoginsComponent
    ]
})
export class UserDetailsViewComponent implements OnInit, OnDestroy {
  @Input() user!: User;

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  @Output() editRequested = new EventEmitter<void>();
  @Output() userChanged = new EventEmitter<User>();

  private currentUserId: string | null = null;

  readonly userTeams = signal<Team[]>([]);
  readonly userEvents = signal<any[]>([]);

  readonly loadingTeams = signal(true);
  readonly loadingEvents = signal(true);

  readonly totalUserTeams = signal(0);
  readonly totalUserEvents = signal(0);
  userTeamsPageSize = 5;
  userEventsPageSize = 5;
  userTeamsPageIndex = 0;
  userEventsPageIndex = 0;
  pageSizeOptions = [5, 10, 25];

  teamSearchTerm = '';
  eventSearchTerm = '';

  private readonly loadTeams$ = new Subject<void>();
  private readonly loadEvents$ = new Subject<void>();
  private readonly teamSearch$ = new Subject<string>();
  private readonly eventSearch$ = new Subject<string>();

  constructor(
    private userService: UserService,
    private sessionService: SessionService,
    private teamsService: TeamService,
    private eventsService: AdminEventsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
    private breadcrumbService: AdminBreadcrumbService
  ) {
    this.loadTeams$
      .pipe(
        switchMap(() =>
          this.teamsService
            .search({
              members: [this.user.id],
              term: this.teamSearchTerm || undefined,
              pageSize: this.userTeamsPageSize,
              pageIndex: this.userTeamsPageIndex,
              omitEventTeams: true
            })
            .pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed()
      )
      .subscribe((results: any) => {
        let teams: Team[] = [];
        let total = 0;
        if (Array.isArray(results) && results.length && results[0]?.items) {
          const page = results[0];
          teams = page.items || [];
          total = page.totalCount ?? teams.length;
        } else if (Array.isArray(results)) {
          teams = results;
          total = results.length;
        } else if (results?.items) {
          teams = results.items || [];
          total = results.totalCount ?? teams.length;
        }

        this.userTeams.set(teams);
        this.totalUserTeams.set(total);
        this.loadingTeams.set(false);
      });

    this.loadEvents$
      .pipe(
        switchMap(() =>
          this.eventsService
            .getEvents({
              userId: this.user.id,
              term: this.eventSearchTerm || undefined,
              page: this.userEventsPageIndex,
              page_size: this.userEventsPageSize
            })
            .pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed()
      )
      .subscribe((results: any) => {
        const events = results?.items || [];
        this.userEvents.set(events);
        this.totalUserEvents.set(results?.totalCount || events.length);
        this.loadingEvents.set(false);
      });

    this.teamSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.userTeamsPageIndex = 0;
        this.loadUserTeams();
      });

    this.eventSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.userEventsPageIndex = 0;
        this.loadUserEvents();
      });
  }

  ngOnInit(): void {
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.sessionService.user$
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((myself) => {
        this.currentUserId = myself?.id ?? null;
      });

    this.loadUserTeams();
    this.loadUserEvents();
  }

  ngOnDestroy(): void {
    this.snackBar.dismiss();
  }

  get hasUserEditPermission(): boolean {
    return this.sessionService.hasPermission('UPDATE_USER');
  }

  get hasUserDeletePermission(): boolean {
    return this.sessionService.hasPermission('DELETE_USER');
  }

  get canUpdatePassword(): boolean {
    return this.sessionService.hasPermission('UPDATE_USER_ROLE');
  }

  get isSelf(): boolean {
    return Boolean(this.currentUserId) && this.currentUserId === this.user?.id;
  }

  private loadUserTeams(): void {
    if (!this.user?.id) {
      return;
    }
    this.loadTeams$.next();
  }

  private loadUserEvents(): void {
    if (!this.user?.id) {
      return;
    }
    this.loadEvents$.next();
  }

  onUserTeamsPageChange(event: PageEvent): void {
    this.userTeamsPageSize = event.pageSize;
    this.userTeamsPageIndex = event.pageIndex;
    this.loadUserTeams();
  }

  onUserEventsPageChange(event: PageEvent): void {
    this.userEventsPageSize = event.pageSize;
    this.userEventsPageIndex = event.pageIndex;
    this.loadUserEvents();
  }

  onTeamSearchChange(term?: string): void {
    this.teamSearchTerm = term || '';
    this.teamSearch$.next(this.teamSearchTerm);
  }

  onEventSearchChange(term?: string): void {
    this.eventSearchTerm = term || '';
    this.eventSearch$.next(this.eventSearchTerm);
  }

  accessTeamNames(eventItem: any): string[] {
    if (!this.user?.id) {
      return [];
    }
    return (eventItem.teams || [])
      .filter((team: any) => team.teamEventId !== eventItem.id && (team.userIds || []).includes(this.user.id))
      .map((team: any) => team.name);
  }

  confirmDeleteUser(): void {
    const dialogRef = this.dialog.open(DeleteUserComponent, {
      width: '600px',
      data: { user: this.user }
    });

    dialogRef.afterClosed().subscribe((result?: { confirmed?: boolean }) => {
      if (result?.confirmed) {
        this.deleteUser();
      }
    });
  }

  private deleteUser(): void {
    this.userService
      .deleteUser(this.user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['../../users'], { relativeTo: this.route }),
        error: (err) => console.error('Failed to delete user:', err)
      });
  }

  confirmChangePassword(): void {
    this.dialog.open(ChangePasswordComponent, {
      width: '600px',
      data: { user: this.user }
    });
  }

  get showAccountStatusAction(): boolean {
    if (!this.user || !this.hasUserEditPermission) {
      return false;
    }
    if (!this.user.active) {
      return true;
    }
    return !this.isSelf;
  }

  get accountStatusLabel(): string {
    if (!this.user) {
      return '';
    }
    if (!this.user.active) {
      return 'Activate User Account';
    }
    return this.user.enabled ? 'Disable Account' : 'Enable Account';
  }

  get accountStatusIcon(): string {
    if (!this.user) {
      return '';
    }
    if (!this.user.active) {
      return 'check_circle';
    }
    return this.user.enabled ? 'block' : 'lock_open';
  }

  get accountStatusBadgeText(): string {
    if (!this.user) {
      return '';
    }
    if (!this.user.active) {
      return 'Inactive';
    }
    return this.user.enabled ? 'Active' : 'Disabled';
  }

  get accountStatusBadgeClass(): string {
    if (!this.user) {
      return '';
    }
    if (!this.user.active) {
      return 'status-badge-inactive';
    }
    return this.user.enabled ? 'status-badge-active' : 'status-badge-disabled';
  }

  get accountStatusHelpText(): string {
    if (!this.user) {
      return '';
    }
    if (!this.user.active) {
      return 'Activating allows this user to access MAGE.';
    }
    return this.user.enabled
      ? 'Disabling prevents this user from accessing MAGE. Account information is retained and access can be restored at any time.'
      : 'Enabling restores MAGE access for this user.';
  }

  toggleAccountStatus(): void {
    if (!this.user) {
      return;
    }
    if (!this.user.active) {
      this.setUserStatus({ active: true });
    } else if (this.user.enabled) {
      this.setUserStatus({ enabled: false });
    } else {
      this.setUserStatus({ enabled: true });
    }
  }

  private setUserStatus(status: { active?: boolean; enabled?: boolean }): void {
    this.userService
      .updateUser(this.user.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userChanged.emit({ ...(this.user as any), ...status } as User);
      });
  }

  get userIconImgUrl(): string | null {
    return userIconUrl(this.user, this.sessionService?.getToken?.());
  }

  get userAvatarImgUrl(): string | null {
    return userAvatarUrl(this.user, this.sessionService?.getToken?.());
  }
}
