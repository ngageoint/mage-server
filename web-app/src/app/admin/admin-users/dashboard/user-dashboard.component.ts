import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { PageEvent as PageEvent } from '@angular/material/paginator';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { UserPagingService } from '../../services/user-paging.service';
import { User } from '@ngageoint/mage.web-core-lib/user';
import { CreateUserModalComponent } from '../create-user/create-user.component';
import { Role } from '../user';
import { BulkUserComponent } from '../bulk-user/bulk-user.component';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { Team } from '../../admin-teams/team';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { UserService } from '../../../user/user.service';
import { AdminToastService } from '../../services/admin-toast.service';
import { SessionService } from 'mage-web-app/http/session.service';

type UserFilter = {
  limit?: number;
  page?: number;
  enabled?: boolean;
  active?: boolean;
};

@Component({
    selector: 'admin-users',
    templateUrl: './user-dashboard.component.html',
    styleUrls: ['./user-dashboard.component.scss'],
    standalone: false
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  dataSource: User[] = [];

  userSearch = '';

  totalUsers = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];

  get hasUserCreatePermission(): boolean {
    return this.sessionService.hasPermission('CREATE_USER');
  }

  stateAndData: any;

  roles: Role[] = [];
  teams: Team[] = [];

  breadcrumbs: AdminBreadcrumb[] = [{ title: 'Users', icon: 'person' }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  userStatusFilter: 'all' | 'active' | 'inactive' | 'disabled' = 'all';

  private destroy$ = new Subject<void>();

  loadingUsers = false;

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private teamService: AdminTeamsService,
    private sessionService: SessionService,
    private userPagingService: UserPagingService,
    private toastService: AdminToastService,
    private breadcrumbService: AdminBreadcrumbService
  ) {
    this.stateAndData = this.userPagingService.constructDefault();
  }

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.refreshUsers();
    this.loadRoles();
    this.fetchTeams();
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
    this.destroy$.next();
    this.destroy$.complete();
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
        const page = Array.isArray(results) ? results[0] : results;
        this.teams = (page?.items ?? []) as Team[];
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

    this.userPagingService
      .search(state, this.userSearch)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          console.error(err);
          return EMPTY;
        })
      )
      .subscribe((users) => {
        const list = users || [];
        this.dataSource = list;
        this.totalUsers = state.pageInfo?.totalCount || list.length;
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.refreshUsers();
  }

  createUser(): void {
    const dialogRef = this.dialog.open(CreateUserModalComponent, {
      width: '50vw',
      maxWidth: '50vw',
      disableClose: true,
      data: { roles: this.roles }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((createdUser) => {
        if (!createdUser) return;
        this.refreshUsers(() => {
          this.toastService.show(
            'User created successfully',
            ['/admin/users', createdUser.id],
            'Go to User'
          );
        });
      });
  }

  openImportModal(): void {
    this.dialog
      .open(BulkUserComponent, {
        width: '75vw',
        maxWidth: '75vw',
        disableClose: true,
        data: { roles: this.roles, teams: this.teams }
      })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result?.imported) {
          this.refreshUsers();
        }
      });
  }

  onStatusFilterChange(
    value: 'all' | 'active' | 'inactive' | 'disabled'
  ): void {
    this.userStatusFilter = value;
    this.pageIndex = 0;
    this.refreshUsers();
  }
}
