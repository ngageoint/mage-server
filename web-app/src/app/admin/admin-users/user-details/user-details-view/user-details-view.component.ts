import { Component, DestroyRef, EventEmitter, Input, OnInit, OnDestroy, OnChanges, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableDataSource } from '@angular/material/table';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';

import { UserService } from '../../../../user/user.service';
import { AdminTeamsService } from '../../../services/admin-teams-service';
import { AdminEventsService } from '../../../services/admin-events.service';
import { DeleteUserComponent } from '../../delete-user/delete-user.component';
import { ChangePasswordComponent } from '../../change-password/change-password.component';
import { User } from '../../user';
import { userAvatarUrl, userIconUrl } from '../../../../entities/user/user';
import { AdminBreadcrumb } from '../../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../../admin-breadcrumb/admin-breadcrumb.service';
import { SessionService } from 'mage-web-app/http/session.service';

@Component({
    selector: 'mage-user-details-view',
    templateUrl: './user-details-view.component.html',
    styleUrls: ['./user-details-view.component.scss'],
    standalone: false
})
export class UserDetailsViewComponent implements OnInit, OnChanges, OnDestroy {
  @Input() user!: User;
  @Input() breadcrumbs: AdminBreadcrumb[] = [];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  @Output() editRequested = new EventEmitter<void>();
  @Output() userChanged = new EventEmitter<User>();

  private currentUserId: string | null = null;

  teamsDataSource = new MatTableDataSource<any>();
  eventsDataSource = new MatTableDataSource<any>();

  loadingTeams = true;
  loadingEvents = true;

  totalUserTeams = 0;
  totalUserEvents = 0;
  userTeamsPageSize = 5;
  userEventsPageSize = 5;
  userTeamsPageIndex = 0;
  userEventsPageIndex = 0;
  pageSizeOptions = [5, 10, 25];

  userTeamSearch = '';
  userEventSearch = '';
  teamSearchTerm = '';
  eventSearchTerm = '';

  private userTeams: any[] = [];
  private userEvents: any[] = [];

  constructor(
    private userService: UserService,
    private sessionService: SessionService,
    private teamsService: AdminTeamsService,
    private eventsService: AdminEventsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.sessionService.user$
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((myself) => {
        this.currentUserId = myself?.id ?? null;
      });

    this.loadUserTeams();
    this.loadUserEvents();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['breadcrumbs']) {
      this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    }
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
    return !!this.currentUserId && this.currentUserId === this.user?.id;
  }

  private loadUserTeams(): void {
    if (!this.user?.id) return;

    this.teamsService
      .getTeams({
        with_members: [this.user.id],
        term: this.userTeamSearch || undefined,
        limit: this.userTeamsPageSize,
        start: String(this.userTeamsPageIndex),
        populate: true,
        omit_event_teams: true
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results: any) => {
          if (Array.isArray(results) && results.length && results[0]?.items) {
            const page = results[0];
            this.userTeams = page.items || [];
            this.totalUserTeams = page.totalCount ?? this.userTeams.length;
          } else if (Array.isArray(results)) {
            this.userTeams = results;
            this.totalUserTeams = results.length;
          } else if (results?.items) {
            this.userTeams = results.items || [];
            this.totalUserTeams = results.totalCount ?? this.userTeams.length;
          } else {
            this.userTeams = [];
            this.totalUserTeams = 0;
          }

          this.teamsDataSource.data = this.userTeams;
          this.loadingTeams = false;
        },
        error: () => {
          this.userTeams = [];
          this.totalUserTeams = 0;
          this.teamsDataSource.data = [];
          this.loadingTeams = false;
        }
      });
  }

  private loadUserEvents(): void {
    if (!this.user?.id) return;

    this.eventsService
      .getEvents({
        userId: this.user.id,
        term: this.userEventSearch || undefined,
        page: this.userEventsPageIndex,
        page_size: this.userEventsPageSize
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results: any) => {
          this.userEvents = results.items || [];
          this.totalUserEvents = results.totalCount || this.userEvents.length;
          this.eventsDataSource.data = this.userEvents;
          this.loadingEvents = false;
        },
        error: () => {
          this.userEvents = [];
          this.totalUserEvents = 0;
          this.eventsDataSource.data = [];
          this.loadingEvents = false;
        }
      });
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
    this.userTeamSearch = this.teamSearchTerm;
    this.userTeamsPageIndex = 0;
    this.loadUserTeams();
  }

  onEventSearchChange(term?: string): void {
    this.eventSearchTerm = term || '';
    this.userEventSearch = this.eventSearchTerm;
    this.userEventsPageIndex = 0;
    this.loadUserEvents();
  }

  accessTeamNames(eventItem: any): string[] {
    if (!this.user?.id) return [];

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
    if (!this.user || !this.hasUserEditPermission) return false;
    if (!this.user.active) return true;
    return !this.isSelf;
  }

  get accountStatusLabel(): string {
    if (!this.user) return '';
    if (!this.user.active) return 'Activate User Account';
    return this.user.enabled ? 'Disable Account' : 'Enable Account';
  }

  get accountStatusIcon(): string {
    if (!this.user) return '';
    if (!this.user.active) return 'check_circle';
    return this.user.enabled ? 'block' : 'lock_open';
  }

  get accountStatusBadgeText(): string {
    if (!this.user) return '';
    if (!this.user.active) return 'Inactive';
    return this.user.enabled ? 'Active' : 'Disabled';
  }

  get accountStatusBadgeClass(): string {
    if (!this.user) return '';
    if (!this.user.active) return 'status-badge-inactive';
    return this.user.enabled ? 'status-badge-active' : 'status-badge-disabled';
  }

  get accountStatusHelpText(): string {
    if (!this.user) return '';
    if (!this.user.active) return 'Activating allows this user to access MAGE.';
    return this.user.enabled
      ? 'Disabling prevents this user from accessing MAGE. Account information is retained and access can be restored at any time.'
      : 'Enabling restores MAGE access for this user.';
  }

  toggleAccountStatus(): void {
    if (!this.user) return;

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
