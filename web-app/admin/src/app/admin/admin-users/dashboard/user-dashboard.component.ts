import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { from, lastValueFrom, EMPTY, Subject } from 'rxjs';
import { mergeMap, tap, catchError, finalize, takeUntil } from 'rxjs/operators';

import { UserPagingService } from '../../../services/user-paging.service';
import { LocalStorageService } from '../../../../../../../web-app/src/app/http/local-storage.service';
import { User } from '@ngageoint/mage.web-core-lib/user';
import { CreateUserModalComponent } from '../create-user/create-user.component';
import { Role } from '../user';
import { BulkUserComponent } from '../bulk-user/bulk-user.component';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { Team } from '../../admin-teams/team';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminToastService } from '../../services/admin-toast.service';

type UserFilter = {
  limit?: number;
  page?: number;
  enabled?: boolean;
  active?: boolean;
};

@Component({
  selector: 'admin-users',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  dataSource: User[] = [];
  displayedColumns: string[] = ['user'];

  userSearch = '';

  totalUsers = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];

  token = '';
  error: string | null = null;

  hasUserCreatePermission = false;

  stateAndData: any;

  roles: Role[] = [];
  teams: Team[] = [];

  isBulkUploading = false;
  bulkProgress = {
    total: 0,
    completed: 0,
    failed: 0
  };
  bulkErrors: { user: any; error: string }[] = [];
  showErrorTable = false;
  isFinalizing = false;
  isFinished = false;

  breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Users',
      iconClass: 'fa fa-user'
    }
  ];

  userStatusFilter: 'all' | 'active' | 'inactive' | 'disabled' = 'all';

  private destroy$ = new Subject<void>();

  loadingUsers = false;

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private localStorageService: LocalStorageService,
    private teamService: AdminTeamsService,
    private userService: AdminUserService,
    private userPagingService: UserPagingService,
    private toastService: AdminToastService
  ) {
    this.token = this.localStorageService.getToken() || '';
    this.stateAndData = this.userPagingService.constructDefault();
  }

  ngOnInit(): void {
    this.initPermissions();
    this.refreshUsers();
    this.loadRoles();
    this.fetchTeams();
    window.addEventListener('beforeunload', this.beforeUnloadListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadListener);
    this.destroy$.next();
    this.destroy$.complete();
  }

  beforeUnloadListener = (event: BeforeUnloadEvent) => {
    if (this.isBulkUploading) {
      event.preventDefault();
      event.returnValue = '';
      return event.returnValue;
    }
    return;
  };

  private initPermissions(): void {
    this.userService.myself$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        const permissions = user?.role?.permissions ?? [];
        this.hasUserCreatePermission = permissions.includes('CREATE_USER');
      });
  }

  private loadRoles(): void {
    this.userService
      .getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe((roles: any[]) => {
        this.roles = roles || [];
      });
  }

  private fetchTeams(): void {
    this.teamService
      .getTeams({
        limit: 9999,
        sort: { name: 1 },
        omit_event_teams: true
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe((results: any) => {
        const items = Array.isArray(results) ? results : results?.items;
        this.teams = (items || []) as Team[];
      });
  }

  getFilter(): UserFilter {
    const filterObject: UserFilter = {
      limit: this.pageSize,
      page: this.pageIndex
    };

    if (this.userStatusFilter === 'all') return filterObject;

    if (this.userStatusFilter === 'disabled') {
      filterObject.active = true;
      filterObject.enabled = false;
    } else if (this.userStatusFilter === 'active') {
      filterObject.active = true;
    } else {
      filterObject.active = false;
    }

    return filterObject;
  }

  private applyFilterToState(pageIndex: number): void {
    const state = this.stateAndData['all'];
    const filterConfig = this.getFilter();
    state.userFilter.pageSize = this.pageSize;
    state.userFilter.pageIndex = pageIndex;
    if (typeof filterConfig.active === 'boolean') {
      state.userFilter.active = filterConfig.active;
    } else {
      delete state.userFilter.active;
    }
    if (typeof filterConfig.enabled === 'boolean') {
      state.userFilter.enabled = filterConfig.enabled;
    } else {
      delete state.userFilter.enabled;
    }
  }

  refreshUsers(onDone?: () => void): void {
    this.applyFilterToState(this.pageIndex);
    const state = this.stateAndData['all'];

    this.userPagingService
      .refresh(this.stateAndData)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const users = this.userPagingService.users(state) || [];
        this.dataSource = users;
        this.totalUsers = state.pageInfo?.totalCount || 0;
        onDone?.();
      });
  }

  onSearchTermChanged(term: string): void {
    this.userSearch = term || '';
    this.pageIndex = 0;
    this.search();
  }

  onSearchCleared(): void {
    this.userSearch = '';
    this.refreshUsers();
  }

  search(): void {
    this.applyFilterToState(0);
    const state = this.stateAndData['all'];
    this.error = null;

    this.userPagingService
      .search(state, this.userSearch)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          console.error(err);
          this.error = 'Search failed.';
          return EMPTY;
        })
      )
      .subscribe((users) => {
        const list = users || [];
        this.dataSource = list;
        this.totalUsers = state.pageInfo?.totalCount || list.length;
      });
  }

  reset(): void {
    this.userSearch = '';
    this.stateAndData = this.userPagingService.constructDefault();
    this.pageIndex = 0;
    this.refreshUsers();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.refreshUsers();
  }

  createUser(): void {
    const dialogRef = this.dialog.open(CreateUserModalComponent, {
      width: '80%',
      disableClose: true,
      data: { roles: this.roles }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((newUser) => {
        if (!newUser?.confirmed) {
          return;
        }

        this.userService.createUser(newUser.user).subscribe({
          next: (createdUser) => {
            this.refreshUsers(() => {
              this.toastService.show(
                'User Created',
                ['../users', createdUser.id],
                'Go to User'
              );
            });
          },
          error: (err) => {
            console.error(err);
            this.refreshUsers();
          }
        });
      });
  }

  openImportModal(): void {
    const dialogRef = this.dialog.open(BulkUserComponent, {
      width: '80vw',
      data: {
        roles: this.roles,
        teams: this.teams
      }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (!result?.users?.length) return;

        this.isBulkUploading = true;
        this.isFinalizing = false;
        this.isFinished = false;
        this.showErrorTable = false;

        this.bulkProgress = {
          total: result.users.length,
          completed: 0,
          failed: 0
        };

        this.bulkCreateUsers(result.users)
          .then(async (createdUsers) => {
            this.isFinalizing = true;

            if (result.selectedTeam?.id) {
              await Promise.all(
                createdUsers.map((u) =>
                  lastValueFrom(
                    this.teamService.addUserToTeam(
                      String(result.selectedTeam.id),
                      u
                    )
                  )
                )
              );
            }
          })
          .finally(() => {
            this.refreshUsers(() => {
              this.isFinalizing = false;
              if (this.bulkErrors.length === 0) {
                this.isFinished = true;
              } else {
                this.showErrorTable = true;
              }
            });
          });
      });
  }

  onStatusFilterChange(
    value: 'all' | 'active' | 'inactive' | 'disabled'
  ): void {
    this.userStatusFilter = value;
    this.pageIndex = 0;
    this.refreshUsers();
  }

  async bulkCreateUsers(users: User[]): Promise<User[]> {
    const usersAdded: User[] = [];

    this.bulkErrors = [];
    this.bulkProgress.total = users.length;
    this.bulkProgress.completed = 0;
    this.bulkProgress.failed = 0;

    const CONCURRENCY = 100;

    await lastValueFrom(
      from(users).pipe(
        mergeMap(
          (userData) =>
            this.userService.createUser(userData).pipe(
              tap((createdUser) => {
                usersAdded.push(createdUser);
              }),
              catchError((err) => {
                this.bulkProgress.failed++;

                this.bulkErrors.push({
                  user: userData,
                  error: err?.error || err?.message || 'Unknown error'
                });

                console.error(
                  `Failed to create user ${userData.username}`,
                  err
                );
                return EMPTY;
              }),
              finalize(() => {
                this.bulkProgress.completed++;
              })
            ),
          CONCURRENCY
        )
      )
    );

    this.refreshUsers();
    return usersAdded;
  }

  getSuccessPercent(): number {
    const { completed, failed, total } = this.bulkProgress;
    if (total === 0) return 0;
    return ((completed - failed) / total) * 100;
  }

  getFailurePercent(): number {
    const { failed, total } = this.bulkProgress;
    if (total === 0) return 0;
    return (failed / total) * 100;
  }

  downloadErrorCSV(): void {
    const headers = ['Username', 'Email', 'Error'];
    const rows = this.bulkErrors.map((err) => [
      err.user?.username || '',
      err.user?.email || '',
      err.error || ''
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `bulk-upload-errors-${Date.now()}.csv`);
    link.click();
  }

  closeBulkUpload(): void {
    this.isBulkUploading = false;
    this.bulkErrors = [];
    this.bulkProgress = { total: 0, completed: 0, failed: 0 };
    this.showErrorTable = false;
    this.isFinalizing = false;
    this.isFinished = false;
  }
}
