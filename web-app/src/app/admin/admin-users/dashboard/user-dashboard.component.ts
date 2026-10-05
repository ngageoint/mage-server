import { Component, OnInit, OnDestroy, TemplateRef, ViewChild, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { EMPTY, Observable, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchAll, takeUntil, tap } from 'rxjs/operators';

import { UserPagingService } from '../../services/user-paging.service';
import { User } from '@ngageoint/mage.web-core-lib/user';
import { CreateUserModalComponent } from '../create-user/create-user.component';
import { Role } from '../user';
import { BulkUserComponent } from '../bulk-user/bulk-user.component';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { UserService } from '../../../user/user.service';
import { AdminToastService } from '../../services/admin-toast.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserAvatarModule } from 'src/app/user/user-avatar/user-avatar.module';

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
    imports: [
      MatCardModule,
      MatChipsModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatButtonModule,
      MatListModule,
      MatPaginatorModule,
      FormsModule,
      RouterLink,
      UserAvatarModule
    ]
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  readonly dataSource = signal<User[]>([]);

  userSearch = '';

  readonly totalUsers = signal(0);
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
  private readonly load$ = new Subject<Observable<{ users: User[]; total: number }>>();
  private readonly searchTerm$ = new Subject<string>();

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private teamService: TeamService,
    private sessionService: SessionService,
    private userPagingService: UserPagingService,
    private toastService: AdminToastService,
    private breadcrumbService: AdminBreadcrumbService
  ) {
    this.stateAndData = this.userPagingService.constructDefault();

    this.load$
      .pipe(switchAll(), takeUntil(this.destroy$))
      .subscribe(({ users, total }) => {
        this.dataSource.set(users);
        this.totalUsers.set(total);
      });

    this.searchTerm$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.search();
      });
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
    /*
    TODO: make a team select component that the bulk import component
    can use instead of eagerly loading all the teams here just in
    case the user clicks the bulk import button.
     */
    this.teamService
      .search({
        pageSize: 9999,
        pageIndex: 0,
        omitEventTeams: true
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

    if (this.userStatusFilter === 'all') {
      return filterObject;
    }

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

    this.load$.next(
      this.userPagingService.refresh(this.stateAndData).pipe(
        map(() => ({
          users: this.userPagingService.users(state) || [],
          total: state.pageInfo?.totalCount || 0
        })),
        tap(() => onDone?.()),
        catchError((err) => {
          console.error(err);
          return EMPTY;
        })
      )
    );
  }

  onSearchTermChanged(term: string): void {
    this.userSearch = term || '';
    this.searchTerm$.next(this.userSearch);
  }

  onSearchCleared(): void {
    this.userSearch = '';
    this.searchTerm$.next('');
  }

  search(): void {
    this.applyFilterToState(0);
    const state = this.stateAndData['all'];

    this.load$.next(
      this.userPagingService.search(state, this.userSearch).pipe(
        map((users) => {
          const list = users || [];
          return { users: list, total: state.pageInfo?.totalCount || list.length };
        }),
        catchError((err) => {
          console.error(err);
          return EMPTY;
        })
      )
    );
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
        if (!createdUser) {
          return;
        }
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
